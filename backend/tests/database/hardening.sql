BEGIN;

ALTER POLICY "Allow read access to texts" ON public.texts
USING (
  owner_id = (SELECT auth.uid())
  OR (SELECT auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
  OR (
    owner_id IS NULL
    AND (
      admin_decision = 'approved'
      OR (admin_decision IS NULL AND processing_status = 'completed')
      OR (
        admin_decision = 'pending'
        AND llm_decision = 'approved'
        AND processing_status = 'completed'
        AND quiz_valid = true
      )
    )
  )
);

-- Deleting an owner must never publish private text. Clean up owned texts first.
ALTER TABLE public.texts DROP CONSTRAINT texts_owner_id_fkey;
ALTER TABLE public.texts ADD CONSTRAINT texts_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;

COMMIT;

BEGIN;

DROP FUNCTION IF EXISTS public.leave_matchmaking_queue(uuid);
CREATE FUNCTION public.leave_matchmaking_queue(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_game_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Forbidden: caller must match user' USING ERRCODE = '42501';
  END IF;

  -- Cancellation must wait for pending matchmaking writes before removing them.
  PERFORM pg_advisory_xact_lock(hashtextextended('public.matchmake', 0));
  SELECT id INTO v_game_id FROM public.pvp_games
  WHERE p_user_id IN (player1_id, player2_id) AND status IN ('pending', 'active')
  LIMIT 1;
  DELETE FROM public.matchmaking_queue WHERE user_id = p_user_id;
  RETURN v_game_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.leave_matchmaking_queue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_matchmaking_queue(uuid) TO authenticated, service_role;

COMMIT;

BEGIN;

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
  LIMIT 1;

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
    LIMIT 1;
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
$function$;

REVOKE ALL ON FUNCTION public.matchmake(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.matchmake(uuid, integer) TO authenticated, service_role;

DROP POLICY "Users can insert own matchmaking_queue entry" ON public.matchmaking_queue;
DROP POLICY "Users can update own matchmaking_queue entry" ON public.matchmaking_queue;

COMMIT;


BEGIN;

ALTER TABLE public.user_activity
  ADD CONSTRAINT user_activity_score_range CHECK (score BETWEEN 0 AND 100),
  ADD CONSTRAINT user_activity_wpm_nonnegative CHECK (wpm >= 0);

COMMIT;
