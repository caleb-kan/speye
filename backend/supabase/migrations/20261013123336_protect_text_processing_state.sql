BEGIN;

CREATE POLICY "Allow admins to update texts" ON public.texts
FOR UPDATE TO authenticated
USING ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin')
WITH CHECK ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin');

CREATE FUNCTION public.guard_text_processing_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_source_changed boolean := false;
  v_trusted boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_source_changed :=
      ROW(NEW.content, NEW.sectional, pg_catalog.to_jsonb(NEW.section_content))
      IS DISTINCT FROM
      ROW(OLD.content, OLD.sectional, pg_catalog.to_jsonb(OLD.section_content));
  END IF;

  -- Guarded SECURITY DEFINER RPCs and service-role workers own processing state.
  v_trusted := current_user IN ('postgres', 'supabase_admin', 'service_role')
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false);

  IF NOT v_trusted THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.processing_status IS DISTINCT FROM 'pending'::public.processing_status
        OR NEW.admin_decision IS DISTINCT FROM 'pending'::public.admin_decision
        OR NEW.llm_decision IS NOT NULL
        OR NEW.llm_violation_type IS NOT NULL
        OR NEW.admin_reviewed_by IS NOT NULL
        OR NEW.admin_reviewed_at IS NOT NULL
        OR NEW.rejection_stage IS NOT NULL
        OR NEW.rejection_reason IS NOT NULL THEN
        RAISE EXCEPTION 'Forbidden: processing state is server-managed'
          USING ERRCODE = '42501';
      END IF;
    ELSE
      IF ROW(NEW.admin_decision, NEW.llm_decision, NEW.llm_violation_type,
          NEW.admin_reviewed_by, NEW.admin_reviewed_at,
          NEW.rejection_stage, NEW.rejection_reason)
        IS DISTINCT FROM
        ROW(OLD.admin_decision, OLD.llm_decision, OLD.llm_violation_type,
          OLD.admin_reviewed_by, OLD.admin_reviewed_at,
          OLD.rejection_stage, OLD.rejection_reason)
        OR (NEW.processing_status IS DISTINCT FROM OLD.processing_status
          AND (NOT v_source_changed
            OR NEW.processing_status IS DISTINCT FROM 'pending'::public.processing_status)) THEN
        RAISE EXCEPTION 'Forbidden: processing state is server-managed'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND (
    v_source_changed
    OR pg_catalog.to_jsonb(NEW.quiz) IS DISTINCT FROM pg_catalog.to_jsonb(OLD.quiz)
    OR ROW(NEW.owner_id, NEW.processing_status, NEW.admin_decision, NEW.quiz_valid)
      IS DISTINCT FROM
      ROW(OLD.owner_id, OLD.processing_status, OLD.admin_decision, OLD.quiz_valid)
  ) THEN
    IF EXISTS (SELECT 1 FROM public.pvp_games
      WHERE text_id = OLD.id AND status IN ('pending', 'active')) THEN
      RAISE EXCEPTION 'Cannot modify text used in an active PvP game';
    END IF;
  END IF;

  IF v_source_changed THEN
    NEW.processing_status := 'pending';
    NEW.quiz := NULL;
    NEW.quiz_valid := NULL;
    NEW.summary := NULL;
    NEW.admin_decision := 'pending';
    NEW.llm_decision := NULL;
    NEW.llm_violation_type := NULL;
    NEW.admin_reviewed_by := NULL;
    NEW.admin_reviewed_at := NULL;
    NEW.rejection_stage := NULL;
    NEW.rejection_reason := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_text_processing_state() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_text_processing_state BEFORE INSERT OR UPDATE ON public.texts
FOR EACH ROW EXECUTE FUNCTION public.guard_text_processing_state();

CREATE OR REPLACE FUNCTION public.queue_text_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.processing_status = 'pending' AND NEW.quiz IS NULL
    AND (TG_OP = 'INSERT' OR
      ROW(NEW.content, NEW.sectional, pg_catalog.to_jsonb(NEW.section_content))
      IS DISTINCT FROM
      ROW(OLD.content, OLD.sectional, pg_catalog.to_jsonb(OLD.section_content))) THEN
    PERFORM pgmq.send('process_text', pg_catalog.jsonb_build_object('text_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER on_text_upload_queue ON public.texts;
CREATE TRIGGER on_text_upload_queue AFTER INSERT OR UPDATE OF content, sectional, section_content ON public.texts
FOR EACH ROW EXECUTE FUNCTION public.queue_text_processing();

CREATE OR REPLACE FUNCTION public.retry_text_processing(p_text_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_text public.texts;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_text FROM public.texts WHERE id = p_text_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Text not found: %', p_text_id;
  END IF;

  IF v_text.owner_id IS DISTINCT FROM auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Forbidden: you do not own this text' USING ERRCODE = '42501';
  END IF;
  IF v_text.rejection_stage = 'process_text' AND v_text.llm_violation_type IS NOT NULL THEN
    RAISE EXCEPTION 'This text cannot be reprocessed because it was rejected for a content policy violation.'
      USING ERRCODE = '42501';
  END IF;
  IF v_text.processing_status = 'pending' THEN
    RETURN;
  END IF;

  UPDATE public.texts SET
    processing_status = 'pending',
    quiz_valid = NULL,
    summary = NULL,
    llm_decision = NULL,
    llm_violation_type = NULL,
    admin_decision = 'pending',
    admin_reviewed_by = NULL,
    admin_reviewed_at = NULL,
    rejection_reason = NULL,
    rejection_stage = NULL
  WHERE id = p_text_id;
  PERFORM pgmq.send('process_text', pg_catalog.jsonb_build_object('text_id', p_text_id));
END;
$function$;

CREATE OR REPLACE FUNCTION public.matchmake(p_user_id uuid, p_elo integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_existing_game public.pvp_games;
  v_rating public.pvp_ratings;
  v_opponent public.matchmaking_queue;
  v_text_id uuid;
  v_quiz_set_index smallint;
  v_word_count integer;
  v_num_questions integer;
  v_max_reading_seconds integer;
  v_max_quiz_seconds integer;
  v_expires_at timestamptz;
  v_game_id uuid;
  v_num_sets integer;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Forbidden: caller must match user' USING ERRCODE = '42501';
  END IF;

  -- shortcut: serialize matchmaking, use ordered per-player locks before scaling.
  PERFORM pg_advisory_xact_lock(hashtextextended('public.matchmake', 0));

  SELECT * INTO v_existing_game FROM public.pvp_games
  WHERE (player1_id = p_user_id OR player2_id = p_user_id)
    AND status IN ('pending', 'active')
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'status', 'already_in_game',
      'game_id', v_existing_game.id,
      'error_message', NULL
    );
  END IF;

  INSERT INTO public.pvp_ratings (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_rating FROM public.pvp_ratings WHERE user_id = p_user_id;

  -- Ratings stored by the server are authoritative for matchmaking.
  p_elo := v_rating.elo_rating;

  IF v_rating.queue_cooldown_until IS NOT NULL AND v_rating.queue_cooldown_until > now() THEN
    RETURN json_build_object(
      'status', 'error',
      'game_id', NULL,
      'error_message', 'Queue cooldown active. Please wait before queuing again.'
    );
  END IF;

  SELECT * INTO v_opponent FROM public.matchmaking_queue
  WHERE user_id != p_user_id
  ORDER BY ABS(player_elo - p_elo), joined_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_opponent IS NULL THEN
    INSERT INTO public.matchmaking_queue (user_id, player_elo)
    VALUES (p_user_id, p_elo)
    ON CONFLICT (user_id) DO UPDATE SET
      player_elo = p_elo,
      last_heartbeat = now();

    RETURN json_build_object(
      'status', 'queued',
      'game_id', NULL,
      'error_message', NULL
    );
  END IF;

  -- Keep the selected passage stable until its game is committed.
  SELECT t.id INTO v_text_id
  FROM public.texts t
  WHERE t.owner_id IS NULL
    AND t.admin_decision = 'approved'
    AND t.processing_status = 'completed'
    AND t.quiz_valid = true
    AND t.sectional = false
    AND NOT EXISTS (
      SELECT 1 FROM public.user_activity ua
      WHERE ua.text_id = t.id AND ua.user_id IN (p_user_id, v_opponent.user_id)
    )
  ORDER BY random()
  LIMIT 1
  FOR SHARE OF t;

  -- Fallback: allow previously-read texts (still exclude sectional)
  IF v_text_id IS NULL THEN
    SELECT t.id INTO v_text_id
    FROM public.texts t
    WHERE t.owner_id IS NULL
      AND t.admin_decision = 'approved'
      AND t.processing_status = 'completed'
      AND t.quiz_valid = true
      AND t.sectional = false
    ORDER BY random()
    LIMIT 1
    FOR SHARE OF t;
  END IF;

  IF v_text_id IS NULL THEN
    INSERT INTO public.matchmaking_queue (user_id, player_elo)
    VALUES (p_user_id, p_elo)
    ON CONFLICT (user_id) DO UPDATE SET
      player_elo = p_elo,
      last_heartbeat = now();

    RETURN json_build_object(
      'status', 'error',
      'game_id', NULL,
      'error_message', 'No eligible texts available for PvP'
    );
  END IF;

  SELECT json_array_length(t.quiz::json->'questionSets') INTO v_num_sets
  FROM public.texts t WHERE t.id = v_text_id;

  IF v_num_sets IS NULL OR v_num_sets = 0 THEN
    v_quiz_set_index := 0;
  ELSE
    v_quiz_set_index := floor(random() * v_num_sets)::smallint;
  END IF;

  SELECT array_length(regexp_split_to_array(trim(t.content), '\s+'), 1) INTO v_word_count
  FROM public.texts t WHERE t.id = v_text_id;

  SELECT json_array_length(t.quiz::json->'questionSets'->v_quiz_set_index->'questions') INTO v_num_questions
  FROM public.texts t WHERE t.id = v_text_id;

  IF v_num_questions IS NULL THEN v_num_questions := 5; END IF;

  v_max_reading_seconds := ceil(v_word_count::numeric / 100) * 60;
  v_max_quiz_seconds := v_num_questions * 20;
  v_expires_at := now() + ((v_max_reading_seconds + v_max_quiz_seconds + 60) || ' seconds')::interval;

  INSERT INTO public.pvp_games (
    player1_id, player2_id, text_id, quiz_set_index, expires_at
  ) VALUES (
    v_opponent.user_id, p_user_id, v_text_id, v_quiz_set_index, v_expires_at
  ) RETURNING id INTO v_game_id;

  INSERT INTO public.pvp_match_notifications (user_id, game_id)
  VALUES (v_opponent.user_id, v_game_id);

  DELETE FROM public.matchmaking_queue WHERE user_id IN (p_user_id, v_opponent.user_id);

  INSERT INTO public.pvp_ratings (user_id) VALUES (v_opponent.user_id) ON CONFLICT (user_id) DO NOTHING;

  RETURN json_build_object(
    'status', 'matched',
    'game_id', v_game_id,
    'error_message', NULL
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_approve_text(p_text_id uuid, p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_text public.texts;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: admin role required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_text FROM public.texts WHERE id = p_text_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Text not found: %', p_text_id;
  END IF;

  IF v_text.rejection_stage = 'process_text' THEN
    UPDATE public.texts SET
      admin_decision = 'approved',
      admin_reviewed_by = p_admin_id,
      admin_reviewed_at = now(),
      llm_decision = NULL,
      llm_violation_type = NULL,
      processing_status = 'pending',
      rejection_reason = NULL,
      rejection_stage = NULL,
      quiz = NULL,
      quiz_valid = NULL,
      summary = NULL
    WHERE id = p_text_id;
    PERFORM pgmq.send('process_text', pg_catalog.jsonb_build_object('text_id', p_text_id));
  ELSE
    IF v_text.processing_status IS DISTINCT FROM 'completed'::public.processing_status
      OR v_text.quiz IS NULL THEN
      RAISE EXCEPTION 'Text must finish processing before approval'
        USING ERRCODE = '55000';
    END IF;

    UPDATE public.texts SET
      admin_decision = 'approved',
      admin_reviewed_by = p_admin_id,
      admin_reviewed_at = now(),
      quiz_valid = CASE WHEN v_text.rejection_stage = 'validate_quiz' THEN true ELSE quiz_valid END,
      rejection_reason = NULL,
      rejection_stage = NULL
    WHERE id = p_text_id;
  END IF;
END;
$function$;

COMMIT;
