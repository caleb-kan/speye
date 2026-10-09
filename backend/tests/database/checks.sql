BEGIN;

INSERT INTO auth.users(id) VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
INSERT INTO public.users(id, username) VALUES
  ('00000000-0000-0000-0000-000000000001', 'owner_a'),
  ('00000000-0000-0000-0000-000000000002', 'reader_b');
INSERT INTO public.pvp_ratings(user_id) VALUES ('00000000-0000-0000-0000-000000000002');
INSERT INTO public.matchmaking_queue(user_id, player_elo) VALUES ('00000000-0000-0000-0000-000000000002', 1000);
INSERT INTO public.texts(id, title, content, owner_id, admin_decision, processing_status, llm_decision, quiz_valid) VALUES
  ('10000000-0000-0000-0000-000000000001', 'private', 'private', '00000000-0000-0000-0000-000000000001', 'approved', 'completed', 'approved', true),
  ('10000000-0000-0000-0000-000000000002', 'rejected', 'rejected', NULL, 'rejected', 'completed', 'rejected', false),
  ('10000000-0000-0000-0000-000000000003', 'unprocessed', 'pending', NULL, 'pending', 'pending', NULL, NULL),
  ('10000000-0000-0000-0000-000000000004', 'approved', 'approved', NULL, 'approved', 'completed', 'approved', true),
  ('10000000-0000-0000-0000-000000000005', 'legacy', 'legacy', NULL, NULL, 'completed', NULL, NULL),
  ('10000000-0000-0000-0000-000000000006', 'validated', 'validated', NULL, 'pending', 'completed', 'approved', true),
  ('10000000-0000-0000-0000-000000000007', 'invalid quiz', 'invalid', NULL, 'pending', 'completed', 'approved', false);

SET LOCAL ROLE anon;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 3 FROM public.texts), 'anonymous visibility';
  ASSERT NOT EXISTS (SELECT 1 FROM public.texts WHERE title IN ('private', 'rejected', 'unprocessed', 'invalid quiz')), 'anonymous sensitive rows';
  BEGIN
    PERFORM public.matchmake('00000000-0000-0000-0000-000000000002', 1000);
    RAISE EXCEPTION 'anonymous matchmaking accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.leave_matchmaking_queue('00000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'anonymous cancellation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
DO $$ DECLARE affected integer; result json; BEGIN
  ASSERT (SELECT count(*) = 3 FROM public.texts), 'other account visibility';
  BEGIN
    INSERT INTO public.matchmaking_queue(user_id, player_elo) VALUES (auth.uid(), 9000);
    RAISE EXCEPTION 'direct queue insertion accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.matchmaking_queue SET player_elo = 9000 WHERE user_id = auth.uid();
  GET DIAGNOSTICS affected = ROW_COUNT;
  ASSERT affected = 0, 'direct queue update accepted';
  BEGIN
    PERFORM public.matchmake('00000000-0000-0000-0000-000000000001', 9000);
    RAISE EXCEPTION 'impersonated matchmaking accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  result := public.matchmake(auth.uid(), 9000);
  ASSERT result ->> 'status' = 'queued', 'RPC queue insertion';
  ASSERT (SELECT player_elo = 1000 FROM public.matchmaking_queue WHERE user_id = auth.uid()), 'authoritative queue rating';
  BEGIN
    PERFORM public.leave_matchmaking_queue('00000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'impersonated cancellation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM public.leave_matchmaking_queue(auth.uid());
  ASSERT NOT EXISTS (SELECT 1 FROM public.matchmaking_queue WHERE user_id = auth.uid()), 'RPC queue cancellation';
END $$;
RESET ROLE;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 4 FROM public.texts), 'owner visibility';
END $$;
RESET ROLE;

SET LOCAL request.jwt.claims = '{"app_metadata":{"role":"admin"}}';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 7 FROM public.texts), 'admin review visibility';
END $$;
RESET ROLE;

DO $$ BEGIN
  BEGIN
    DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'owner deletion published private text';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  BEGIN
    DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'auth deletion published private text';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  ASSERT EXISTS (SELECT 1 FROM public.texts WHERE title = 'private' AND owner_id IS NOT NULL), 'private ownership preserved';
END $$;

INSERT INTO public.user_activity(user_id, text_id, wpm, score, start_time, mode, progress_index)
VALUES ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2322, 100, now(), 'adaptive', 10);
DO $$ DECLARE bad_score integer; BEGIN
  FOREACH bad_score IN ARRAY ARRAY[-1, 101] LOOP
    BEGIN
      UPDATE public.user_activity SET score = bad_score;
      RAISE EXCEPTION 'invalid quiz score accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
  END LOOP;
  BEGIN
    UPDATE public.user_activity SET wpm = -1;
    RAISE EXCEPTION 'negative WPM accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

ROLLBACK;
