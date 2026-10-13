BEGIN;

INSERT INTO auth.users(id) VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003');
INSERT INTO public.users(id, username) VALUES
  ('00000000-0000-0000-0000-000000000001', 'text_owner'),
  ('00000000-0000-0000-0000-000000000002', 'text_outsider'),
  ('00000000-0000-0000-0000-000000000003', 'text_admin');
INSERT INTO public.texts(id, content, owner_id, processing_status, quiz, quiz_valid, summary, admin_decision, llm_decision, llm_violation_type, rejection_stage, rejection_reason) VALUES
  ('10000000-0000-0000-0000-000000000010', 'Approved private source', '00000000-0000-0000-0000-000000000001', 'completed', '{"questionSets":[]}', true, 'Old summary', 'approved', 'approved', NULL, NULL, NULL),
  ('10000000-0000-0000-0000-000000000011', 'Rejected private source', '00000000-0000-0000-0000-000000000001', 'failed', NULL, false, NULL, 'pending', 'rejected', 'policy', 'process_text', 'Policy violation'),
  ('10000000-0000-0000-0000-000000000012', 'Failed private source', '00000000-0000-0000-0000-000000000001', 'failed', NULL, false, NULL, 'pending', 'rejected', NULL, 'process_text', 'Provider unavailable'),
  ('10000000-0000-0000-0000-000000000013', 'Approved public source', NULL, 'completed', '{"questionSets":[]}', false, 'Old public summary', 'approved', 'approved', NULL, NULL, NULL);
INSERT INTO public.texts(id, content, owner_id, processing_status, quiz, quiz_valid, admin_decision, llm_decision, sectional, section_content)
VALUES ('10000000-0000-0000-0000-000000000014', 'Section one', '00000000-0000-0000-0000-000000000001', 'completed', '{"questionSets":[]}', true, 'approved', 'approved', true, '[{"title":"One","content":"Section one"}]');

INSERT INTO public.texts(id, content, owner_id, processing_status, quiz, quiz_valid, admin_decision, llm_decision, rejection_stage) VALUES
  ('10000000-0000-0000-0000-000000000016', 'Completed source with rejected quiz', '00000000-0000-0000-0000-000000000001', 'completed', '{"questionSets":[{"questions":[{"question":"Which source was revised?","options":["The passage","The rating","The timer","The route"],"correctAnswer":0},{"question":"What tests the passage?","options":["The quiz","The queue","The theme","The icon"],"correctAnswer":0},{"question":"Which result is retained?","options":["The answer","The color","The title","The size"],"correctAnswer":0},{"question":"What is the reader editing?","options":["The quiz","The app","The rank","The clock"],"correctAnswer":0},{"question":"Which version is current?","options":["The revision","The snapshot","The backup","The draft"],"correctAnswer":0}]}]}', false, 'pending', 'approved', 'validate_quiz'),
  ('10000000-0000-0000-0000-000000000017', 'Completed source missing quiz', '00000000-0000-0000-0000-000000000001', 'completed', NULL, false, 'pending', 'approved', NULL);

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET LOCAL request.jwt.claims = '{}';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.retry_text_processing('10000000-0000-0000-0000-000000000011');
    RAISE EXCEPTION 'TOS-rejected source retry accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  ASSERT (SELECT processing_status = 'failed' AND llm_violation_type = 'policy' FROM public.texts WHERE id = '10000000-0000-0000-0000-000000000011'), 'TOS rejection must survive denied retry';
END $$;
RESET ROLE;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 0 FROM pgmq.sent_messages), 'denied retry must not enqueue inference';
END $$;

SET LOCAL ROLE authenticated;
DO $$ DECLARE assignment text; BEGIN
  FOREACH assignment IN ARRAY ARRAY[
    'admin_decision = ''approved''',
    'llm_decision = ''approved''',
    'llm_violation_type = NULL',
    'admin_reviewed_by = ''00000000-0000-0000-0000-000000000003''',
    'admin_reviewed_at = now()',
    'rejection_stage = NULL',
    'rejection_reason = NULL',
    'processing_status = ''completed'''
  ] LOOP
    BEGIN
      EXECUTE 'UPDATE public.texts SET ' || assignment || ' WHERE id = ''10000000-0000-0000-0000-000000000011''';
      RAISE EXCEPTION 'owner changed trusted text state: %', assignment;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  BEGIN
    INSERT INTO public.texts(content, owner_id, admin_decision) VALUES ('forged', auth.uid(), 'approved');
    RAISE EXCEPTION 'owner uploaded forged approval';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.texts(content, owner_id, processing_status) VALUES ('forged', auth.uid(), 'completed');
    RAISE EXCEPTION 'owner uploaded forged processing status';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.texts SET content = 'forged source', processing_status = NULL
    WHERE id = '10000000-0000-0000-0000-000000000010';
    RAISE EXCEPTION 'owner changed source with a null processing status';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

INSERT INTO public.texts(id, content, owner_id) VALUES ('10000000-0000-0000-0000-000000000015', 'New upload', auth.uid());
UPDATE public.texts SET quiz = '{"questionSets":[{"questions":[{"question":"Which source was revised?","options":["The passage","The rating","The timer","The route"],"correctAnswer":0},{"question":"What tests the passage?","options":["The quiz","The queue","The theme","The icon"],"correctAnswer":0},{"question":"Which result is retained?","options":["The answer","The color","The title","The size"],"correctAnswer":0},{"question":"What is the reader editing?","options":["The quiz","The app","The rank","The clock"],"correctAnswer":0},{"question":"Which version is current?","options":["The revision","The snapshot","The backup","The draft"],"correctAnswer":0}]}]}', quiz_valid = true
WHERE id = '10000000-0000-0000-0000-000000000010';
DO $$ BEGIN
  ASSERT (SELECT quiz::jsonb = '{"questionSets":[{"questions":[{"question":"Which source was revised?","options":["The passage","The rating","The timer","The route"],"correctAnswer":0},{"question":"What tests the passage?","options":["The quiz","The queue","The theme","The icon"],"correctAnswer":0},{"question":"Which result is retained?","options":["The answer","The color","The title","The size"],"correctAnswer":0},{"question":"What is the reader editing?","options":["The quiz","The app","The rank","The clock"],"correctAnswer":0},{"question":"Which version is current?","options":["The revision","The snapshot","The backup","The draft"],"correctAnswer":0}]}]}'::jsonb AND quiz_valid AND processing_status = 'completed' FROM public.texts WHERE id = '10000000-0000-0000-0000-000000000010'), 'owner manual quiz repair';
END $$;
UPDATE public.texts SET content = 'New private source', quiz = NULL, quiz_valid = false, summary = NULL
WHERE id = '10000000-0000-0000-0000-000000000010';
SELECT public.retry_text_processing('10000000-0000-0000-0000-000000000010');
SELECT public.retry_text_processing('10000000-0000-0000-0000-000000000010');
DO $$ BEGIN
  ASSERT (SELECT processing_status = 'pending' AND admin_decision = 'pending' AND llm_decision IS NULL AND admin_reviewed_by IS NULL AND admin_reviewed_at IS NULL AND quiz IS NULL AND quiz_valid IS NULL AND summary IS NULL FROM public.texts WHERE id = '10000000-0000-0000-0000-000000000010'), 'edited source cannot retain approval or generated outputs';
END $$;
SELECT public.retry_text_processing('10000000-0000-0000-0000-000000000012');
SELECT public.retry_text_processing('10000000-0000-0000-0000-000000000012');
UPDATE public.texts SET section_content = '[{"title":"One","content":"Revised section one"}]'
WHERE id = '10000000-0000-0000-0000-000000000014';
RESET ROLE;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 4 FROM pgmq.sent_messages), 'one queue job per upload, source edit, or transient retry';
  ASSERT (SELECT processing_status = 'pending' AND admin_decision = 'pending' AND quiz IS NULL FROM public.texts WHERE id = '10000000-0000-0000-0000-000000000014'), 'section edits invalidate processing';
END $$;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SET LOCAL request.jwt.claims = '{"user_metadata":{"role":"admin"}}';
SET LOCAL ROLE authenticated;
DO $$ DECLARE affected integer; BEGIN
  UPDATE public.texts SET title = 'unauthorized' WHERE id IN ('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000013');
  GET DIAGNOSTICS affected = ROW_COUNT;
  ASSERT affected = 0, 'other users cannot edit public or private sources';
END $$;
RESET ROLE;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
SET LOCAL request.jwt.claims = '{"app_metadata":{"role":"admin"}}';
SET LOCAL ROLE authenticated;
UPDATE public.texts SET title = 'Admin edited title', quiz = '{"questionSets":[{"questions":[{"question":"Which source was revised?","options":["The passage","The rating","The timer","The route"],"correctAnswer":0},{"question":"What tests the passage?","options":["The quiz","The queue","The theme","The icon"],"correctAnswer":0},{"question":"Which result is retained?","options":["The answer","The color","The title","The size"],"correctAnswer":0},{"question":"What is the reader editing?","options":["The quiz","The app","The rank","The clock"],"correctAnswer":0},{"question":"Which version is current?","options":["The revision","The snapshot","The backup","The draft"],"correctAnswer":0}]}]}', quiz_valid = true
WHERE id = '10000000-0000-0000-0000-000000000013';
DO $$ BEGIN
  ASSERT (SELECT title = 'Admin edited title' AND quiz_valid AND processing_status = 'completed' FROM public.texts WHERE id = '10000000-0000-0000-0000-000000000013'), 'admin public title and manual quiz editing';
END $$;
SELECT public.admin_approve_text('10000000-0000-0000-0000-000000000013', auth.uid());
SELECT public.admin_approve_text('10000000-0000-0000-0000-000000000016', auth.uid());
DO $$ DECLARE text_id uuid; BEGIN
  ASSERT (SELECT admin_decision = 'approved' AND processing_status = 'completed' AND admin_reviewed_by = auth.uid() AND quiz IS NOT NULL FROM public.texts WHERE id = '10000000-0000-0000-0000-000000000013'), 'ordinary approval retains completed processing';
  ASSERT (SELECT admin_decision = 'approved' AND processing_status = 'completed' AND quiz_valid AND rejection_stage IS NULL FROM public.texts WHERE id = '10000000-0000-0000-0000-000000000016'), 'completed quiz-quality override remains available';
  FOREACH text_id IN ARRAY ARRAY['10000000-0000-0000-0000-000000000015'::uuid, '10000000-0000-0000-0000-000000000017'::uuid] LOOP
    BEGIN
      PERFORM public.admin_approve_text(text_id, auth.uid());
      RAISE EXCEPTION 'unprocessed or quiz-less ordinary approval accepted';
    EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
    END;
  END LOOP;
END $$;
RESET ROLE;
INSERT INTO public.pvp_games(id, player1_id, player2_id, text_id, quiz_set_index, expires_at)
VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000013', 0, now() + interval '1 hour');
SET LOCAL ROLE authenticated;
DO $$ DECLARE assignment text; BEGIN
  FOREACH assignment IN ARRAY ARRAY[
    'content = ''New source during PvP''',
    'quiz = NULL',
    'quiz_valid = false',
    'processing_status = ''pending''',
    'admin_decision = ''pending''',
    'owner_id = ''00000000-0000-0000-0000-000000000003'''
  ] LOOP
    BEGIN
      EXECUTE 'UPDATE public.texts SET ' || assignment || ' WHERE id = ''10000000-0000-0000-0000-000000000013''';
      RAISE EXCEPTION 'active passage changed during PvP: %', assignment;
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'Cannot modify text used in an active PvP game' THEN RAISE; END IF;
    END;
  END LOOP;
  BEGIN
    PERFORM public.retry_text_processing('10000000-0000-0000-0000-000000000013');
    RAISE EXCEPTION 'active passage retry accepted during PvP';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Cannot modify text used in an active PvP game' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;
UPDATE public.pvp_games SET status = 'active' WHERE id = '20000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    UPDATE public.texts SET content = 'Changed active source' WHERE id = '10000000-0000-0000-0000-000000000013';
    RAISE EXCEPTION 'active-game source change accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Cannot modify text used in an active PvP game' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;
DELETE FROM public.pvp_games WHERE id = '20000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
UPDATE public.texts SET content = 'New public source' WHERE id = '10000000-0000-0000-0000-000000000013';
SELECT public.retry_text_processing('10000000-0000-0000-0000-000000000013');
SELECT public.admin_approve_text('10000000-0000-0000-0000-000000000011', auth.uid());
DO $$ BEGIN
  ASSERT (SELECT admin_decision = 'approved' AND processing_status = 'pending' AND admin_reviewed_by = auth.uid() AND llm_violation_type IS NULL FROM public.texts WHERE id = '10000000-0000-0000-0000-000000000011'), 'guarded admin override remains available';
END $$;
SELECT public.admin_regenerate_quiz('10000000-0000-0000-0000-000000000011', auth.uid());
RESET ROLE;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 7 FROM pgmq.sent_messages), 'admin source edit, override, and regeneration each enqueue once';
END $$;

SET LOCAL request.jwt.claim.sub = '';
SET LOCAL request.jwt.claims = '{}';
SET LOCAL ROLE anon;
DO $$ BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM public.texts WHERE id = '10000000-0000-0000-0000-000000000013'), 'new public source remains unpublished during moderation';
END $$;
RESET ROLE;

SET LOCAL request.jwt.claims = '{}';
SET LOCAL ROLE service_role;
UPDATE public.texts SET processing_status = 'completed', quiz = '{"questionSets":[]}', summary = 'New generated summary', llm_decision = 'approved', admin_decision = 'pending'
WHERE id = '10000000-0000-0000-0000-000000000010';
UPDATE public.texts SET quiz_valid = true WHERE id = '10000000-0000-0000-0000-000000000010';
DO $$ BEGIN
  ASSERT (SELECT processing_status = 'completed' AND llm_decision = 'approved' AND quiz_valid AND summary = 'New generated summary' FROM public.texts WHERE id = '10000000-0000-0000-0000-000000000010'), 'service-role processing and validation writers';
END $$;
RESET ROLE;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 7 FROM pgmq.sent_messages), 'generated-output updates do not duplicate processing jobs';
END $$;

ROLLBACK;
