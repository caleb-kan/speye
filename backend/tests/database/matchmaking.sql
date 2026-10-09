INSERT INTO auth.users(id) VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003');
INSERT INTO public.users(id, username) VALUES
  ('00000000-0000-0000-0000-000000000001', 'caller_a'),
  ('00000000-0000-0000-0000-000000000002', 'opponent_b'),
  ('00000000-0000-0000-0000-000000000003', 'opponent_c');
INSERT INTO public.pvp_ratings(user_id) SELECT id FROM public.users;
INSERT INTO public.matchmaking_queue(user_id, player_elo) VALUES
  ('00000000-0000-0000-0000-000000000002', 1000),
  ('00000000-0000-0000-0000-000000000003', 1000);
INSERT INTO public.texts(title, content, admin_decision, processing_status, quiz_valid, sectional, quiz)
VALUES ('eligible', 'one two three four five', 'approved', 'completed', true, false, '{"questionSets":[{"questions":[{},{},{},{},{}]}]}');

-- Keep the first transaction open while another request enters matchmaking.
CREATE FUNCTION public.slow_match_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_sleep(0.5);
  RETURN NEW;
END $$;
CREATE TRIGGER slow_match_insert BEFORE INSERT ON public.pvp_games
FOR EACH ROW EXECUTE FUNCTION public.slow_match_insert();
