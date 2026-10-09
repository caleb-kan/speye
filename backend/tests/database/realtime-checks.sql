BEGIN;

INSERT INTO auth.users(id) VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003');
INSERT INTO public.users(id, username) VALUES
  ('00000000-0000-0000-0000-000000000001', 'player_a'),
  ('00000000-0000-0000-0000-000000000002', 'player_b'),
  ('00000000-0000-0000-0000-000000000003', 'outsider_c');
INSERT INTO public.texts(id, title, content) VALUES
  ('10000000-0000-0000-0000-000000000001', 'sample', 'sample');
INSERT INTO public.pvp_games(id, player1_id, player2_id, text_id, quiz_set_index, expires_at) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 0, now() + interval '1 hour');
INSERT INTO realtime.messages(topic, extension) VALUES
  ('pvp-game:20000000-0000-0000-0000-000000000001', 'broadcast');
SET LOCAL realtime.topic = 'pvp-game:20000000-0000-0000-0000-000000000001';

SET LOCAL ROLE anon;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 0 FROM realtime.messages), 'anonymous broadcast visibility';
  BEGIN
    INSERT INTO realtime.messages(extension) VALUES ('broadcast');
    RAISE EXCEPTION 'anonymous broadcast accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 0 FROM realtime.messages), 'outsider broadcast visibility';
  BEGIN
    INSERT INTO realtime.messages(extension) VALUES ('broadcast');
    RAISE EXCEPTION 'outsider broadcast accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 1 FROM realtime.messages), 'player broadcast visibility';
  INSERT INTO realtime.messages(extension) VALUES ('broadcast');
  BEGIN
    INSERT INTO realtime.messages(extension) VALUES ('presence');
    RAISE EXCEPTION 'unsupported extension accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 2 FROM realtime.messages), 'opponent broadcast visibility';
  INSERT INTO realtime.messages(extension) VALUES ('broadcast');
END $$;
SET LOCAL realtime.topic = 'pvp-game:unknown';
DO $$ BEGIN
  ASSERT (SELECT count(*) = 0 FROM realtime.messages), 'unknown topic visibility';
  BEGIN
    INSERT INTO realtime.messages(extension) VALUES ('broadcast');
    RAISE EXCEPTION 'unknown topic accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

ROLLBACK;
