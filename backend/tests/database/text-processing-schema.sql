CREATE SCHEMA pgmq;
CREATE TABLE pgmq.sent_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  queue_name text NOT NULL,
  message jsonb NOT NULL
);
CREATE FUNCTION pgmq.send(queue_name text, msg jsonb) RETURNS bigint
LANGUAGE plpgsql SET search_path TO '' AS $function$
DECLARE message_id bigint;
BEGIN
  INSERT INTO pgmq.sent_messages(queue_name, message)
  VALUES (queue_name, msg) RETURNING id INTO message_id;
  RETURN message_id;
END;
$function$;
REVOKE ALL ON FUNCTION pgmq.send(text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.queue_text_processing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.processing_status = 'pending' AND NEW.quiz IS NULL THEN
    -- Ensure approval fields are in initial state
    NEW.llm_decision := NULL;
    NEW.llm_violation_type := NULL;
    NEW.admin_decision := 'pending'::admin_decision;
    NEW.rejection_reason := NULL;
    NEW.rejection_stage := NULL;

    PERFORM pgmq.send(
      queue_name => 'process_text',
      msg => jsonb_build_object('text_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.retry_text_processing(p_text_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_status text;
  v_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT processing_status::text, owner_id INTO current_status, v_owner_id
  FROM texts WHERE id = p_text_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Text not found: %', p_text_id;
  END IF;

  IF v_owner_id IS DISTINCT FROM auth.uid()
     AND (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Forbidden: you do not own this text';
  END IF;

  IF current_status = 'pending' THEN
    RETURN;
  END IF;

  UPDATE texts
  SET processing_status = 'pending'::processing_status,
      quiz_valid = NULL,
      summary = NULL,
      llm_decision = NULL,
      llm_violation_type = NULL,
      admin_decision = 'pending'::admin_decision,
      rejection_reason = NULL,
      rejection_stage = NULL
  WHERE id = p_text_id;

  PERFORM pgmq.send('process_text', jsonb_build_object('text_id', p_text_id));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_text_worker_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  -- Compare JSONB so the existing json quiz/section columns have structural
  -- equality for revision comparisons.
  IF (pg_catalog.to_jsonb(NEW) - ARRAY['worker_revision', 'has_summary'])
      IS DISTINCT FROM (pg_catalog.to_jsonb(OLD) - ARRAY['worker_revision', 'has_summary']) THEN
    NEW.worker_revision := pg_catalog.gen_random_uuid();
  ELSE
    NEW.worker_revision := OLD.worker_revision;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_approve_text(p_text_id uuid, p_admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rejection_stage rejection_stage;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  SELECT rejection_stage INTO v_rejection_stage
  FROM texts WHERE id = p_text_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Text not found: %', p_text_id;
  END IF;

  IF v_rejection_stage = 'process_text' THEN
    -- TOS violation: admin approves the content, requeue for processing.
    -- admin_decision = 'approved' signals process-text-worker to skip TOS check.
    UPDATE texts SET
      admin_decision = 'approved'::admin_decision,
      admin_reviewed_by = p_admin_id,
      admin_reviewed_at = NOW(),
      llm_decision = NULL,
      llm_violation_type = NULL,
      processing_status = 'pending'::processing_status,
      rejection_reason = NULL,
      rejection_stage = NULL,
      quiz = NULL,
      quiz_valid = NULL,
      summary = NULL
    WHERE id = p_text_id;

    -- Explicitly queue: on_text_upload_queue trigger is INSERT-only
    PERFORM pgmq.send('process_text', jsonb_build_object('text_id', p_text_id::text));

  ELSIF v_rejection_stage = 'validate_quiz' THEN
    UPDATE texts SET
      admin_decision = 'approved'::admin_decision,
      admin_reviewed_by = p_admin_id,
      admin_reviewed_at = NOW(),
      quiz_valid = TRUE,
      rejection_reason = NULL,
      rejection_stage = NULL
    WHERE id = p_text_id;

  ELSE
    UPDATE texts SET
      admin_decision = 'approved'::admin_decision,
      admin_reviewed_by = p_admin_id,
      admin_reviewed_at = NOW(),
      processing_status = 'completed'::processing_status,
      rejection_reason = NULL,
      rejection_stage = NULL
    WHERE id = p_text_id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_regenerate_quiz(p_text_id uuid, p_admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  UPDATE texts SET
    processing_status = 'pending'::processing_status,
    llm_decision = NULL,
    llm_violation_type = NULL,
    admin_decision = 'pending'::admin_decision,
    admin_reviewed_by = p_admin_id,
    admin_reviewed_at = NOW(),
    rejection_reason = NULL,
    rejection_stage = NULL,
    quiz = NULL,
    quiz_valid = NULL
  WHERE id = p_text_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Text not found: %', p_text_id;
  END IF;

  PERFORM pgmq.send('process_text', jsonb_build_object('text_id', p_text_id::text));
END;
$function$
;

CREATE TRIGGER on_text_upload_queue AFTER INSERT ON public.texts
FOR EACH ROW EXECUTE FUNCTION public.queue_text_processing();
CREATE TRIGGER zz_refresh_text_worker_revision BEFORE UPDATE ON public.texts
FOR EACH ROW EXECUTE FUNCTION public.refresh_text_worker_revision();
REVOKE ALL ON FUNCTION public.retry_text_processing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retry_text_processing(uuid) TO authenticated, service_role;
GRANT USAGE ON SCHEMA public, auth TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
