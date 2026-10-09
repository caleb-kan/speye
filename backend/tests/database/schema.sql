-- Synthetic application schema for a new isolated test container. No production rows.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
DROP SCHEMA public CASCADE; CREATE SCHEMA public;

DROP SCHEMA IF EXISTS auth CASCADE; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_app_meta_data jsonb DEFAULT '{}'::jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE SCHEMA realtime;
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('realtime.topic',true),'')::text $$;
CREATE TABLE realtime.messages(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, topic text, extension text, payload jsonb, private boolean DEFAULT true);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA realtime TO anon,authenticated;
GRANT SELECT,INSERT ON realtime.messages TO anon,authenticated;
CREATE TYPE public."admin_decision" AS ENUM ('approved', 'rejected', 'pending');
CREATE TYPE public."llm_decision" AS ENUM ('approved', 'rejected');
CREATE TYPE public."notification_type" AS ENUM ('info', 'alert', 'error');
CREATE TYPE public."processing_status" AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE public."pvp_game_status" AS ENUM ('pending', 'active', 'completed', 'abandoned');
CREATE TYPE public."reading_mode" AS ENUM ('standard', 'adaptive', 'rsvp');
CREATE TYPE public."rejection_stage" AS ENUM ('process_text', 'validate_quiz');
CREATE TABLE public."elo_history" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"player_id" uuid NOT NULL,
"old_elo" int4 NOT NULL,
"new_elo" int4 NOT NULL,
"game_id" uuid NOT NULL,
"created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE public."matchmaking_queue" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid NOT NULL,
"player_elo" int4 NOT NULL,
"joined_at" timestamptz DEFAULT now() NOT NULL,
"last_heartbeat" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE public."notifications" (
"id" int8 NOT NULL,
"user_id" uuid NOT NULL,
"message" text NOT NULL,
"seen" bool DEFAULT false NOT NULL,
"created_at" timestamptz DEFAULT now() NOT NULL,
"type" notification_type NOT NULL,
"link" text,
"toast_shown" bool DEFAULT false NOT NULL
);
CREATE TABLE public."pvp_games" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"player1_id" uuid NOT NULL,
"player2_id" uuid NOT NULL,
"text_id" uuid NOT NULL,
"quiz_set_index" int2 NOT NULL,
"status" pvp_game_status DEFAULT 'pending'::pvp_game_status NOT NULL,
"winner_id" uuid,
"player1_ready" bool DEFAULT false,
"player2_ready" bool DEFAULT false,
"player1_wpm" int4,
"player1_quiz_score" int4,
"player1_overall_score" int4,
"player1_finished_at" timestamptz,
"player2_wpm" int4,
"player2_quiz_score" int4,
"player2_overall_score" int4,
"player2_finished_at" timestamptz,
"player1_progress" int4 DEFAULT 0,
"player2_progress" int4 DEFAULT 0,
"player1_elo_before" int4,
"player2_elo_before" int4,
"player1_elo_change" int4,
"player2_elo_change" int4,
"forfeit_by" uuid,
"created_at" timestamptz DEFAULT now() NOT NULL,
"reading_started_at" timestamptz,
"finished_at" timestamptz,
"expires_at" timestamptz NOT NULL
);
CREATE TABLE public."pvp_match_notifications" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid NOT NULL,
"game_id" uuid NOT NULL,
"created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE public."pvp_ratings" (
"user_id" uuid NOT NULL,
"elo_rating" int4 DEFAULT 1000 NOT NULL,
"peak_elo" int4 DEFAULT 1000 NOT NULL,
"games_played" int4 DEFAULT 0 NOT NULL,
"wins" int4 DEFAULT 0 NOT NULL,
"losses" int4 DEFAULT 0 NOT NULL,
"draws" int4 DEFAULT 0 NOT NULL,
"forfeit_count" int4 DEFAULT 0 NOT NULL,
"last_forfeit_at" timestamptz,
"queue_cooldown_until" timestamptz,
"last_game_at" timestamptz
);
CREATE TABLE public."texts" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"uploaded_at" timestamptz DEFAULT now() NOT NULL,
"owner_id" uuid,
"content" text NOT NULL,
"quiz" json,
"fiction" bool,
"complexity" int2,
"title" text,
"source" text,
"preview" text,
"processing_status" processing_status DEFAULT 'pending'::processing_status,
"quiz_valid" bool,
"summary" text,
"has_summary" bool,
"llm_decision" llm_decision,
"llm_violation_type" text,
"admin_decision" admin_decision DEFAULT 'pending'::admin_decision,
"admin_reviewed_by" uuid,
"admin_reviewed_at" timestamptz,
"rejection_reason" text,
"rejection_stage" rejection_stage,
"sectional" bool DEFAULT false NOT NULL,
"section_content" json,
"worker_revision" uuid DEFAULT gen_random_uuid() NOT NULL
);
CREATE TABLE public."user_activity" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid DEFAULT auth.uid() NOT NULL,
"text_id" uuid,
"score" float8,
"wpm" int8 DEFAULT '0'::bigint NOT NULL,
"start_time" timestamptz DEFAULT now() NOT NULL,
"end_time" timestamptz DEFAULT now(),
"mode" reading_mode DEFAULT 'standard'::reading_mode NOT NULL,
"progress_index" int4 NOT NULL,
"game_id" uuid
);
CREATE TABLE public."users" (
"id" uuid NOT NULL,
"username" text
);
ALTER TABLE public."elo_history" ADD PRIMARY KEY (id);
ALTER TABLE public."matchmaking_queue" ADD PRIMARY KEY (id);
ALTER TABLE public."matchmaking_queue" ADD UNIQUE (user_id);
ALTER TABLE public."notifications" ADD PRIMARY KEY (id);
ALTER TABLE public."pvp_games" ADD PRIMARY KEY (id);
ALTER TABLE public."pvp_match_notifications" ADD PRIMARY KEY (id);
ALTER TABLE public."pvp_ratings" ADD PRIMARY KEY (user_id);
ALTER TABLE public."texts" ADD PRIMARY KEY (id);
ALTER TABLE public."user_activity" ADD PRIMARY KEY (id);
ALTER TABLE public."users" ADD PRIMARY KEY (id);
ALTER TABLE public."users" ADD CHECK (((length(username) >= 3) AND (length(username) <= 20)));
ALTER TABLE public."users" ADD UNIQUE (username);
ALTER TABLE public."elo_history" ADD FOREIGN KEY (game_id) REFERENCES pvp_games(id);
ALTER TABLE public."elo_history" ADD FOREIGN KEY (player_id) REFERENCES auth.users(id);
ALTER TABLE public."elo_history" ADD FOREIGN KEY (player_id) REFERENCES users(id);
ALTER TABLE public."matchmaking_queue" ADD FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public."matchmaking_queue" ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."notifications" ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."pvp_games" ADD FOREIGN KEY (forfeit_by) REFERENCES auth.users(id);
ALTER TABLE public."pvp_games" ADD FOREIGN KEY (player1_id) REFERENCES auth.users(id);
ALTER TABLE public."pvp_games" ADD FOREIGN KEY (player1_id) REFERENCES users(id);
ALTER TABLE public."pvp_games" ADD FOREIGN KEY (player2_id) REFERENCES auth.users(id);
ALTER TABLE public."pvp_games" ADD FOREIGN KEY (player2_id) REFERENCES users(id);
ALTER TABLE public."pvp_games" ADD FOREIGN KEY (text_id) REFERENCES texts(id);
ALTER TABLE public."pvp_games" ADD FOREIGN KEY (winner_id) REFERENCES auth.users(id);
ALTER TABLE public."pvp_match_notifications" ADD FOREIGN KEY (game_id) REFERENCES pvp_games(id);
ALTER TABLE public."pvp_match_notifications" ADD FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public."pvp_match_notifications" ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."pvp_ratings" ADD FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public."pvp_ratings" ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public."texts" ADD FOREIGN KEY (admin_reviewed_by) REFERENCES auth.users(id);
ALTER TABLE public."texts" ADD CONSTRAINT texts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."user_activity" ADD FOREIGN KEY (game_id) REFERENCES pvp_games(id);
ALTER TABLE public."user_activity" ADD FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE SET NULL;
ALTER TABLE public."user_activity" ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."users" ADD FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."elo_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."matchmaking_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pvp_games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pvp_match_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pvp_ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."texts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own elo_history" ON public."elo_history" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read matchmaking_queue" ON public."matchmaking_queue" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can delete own matchmaking_queue entry" ON public."matchmaking_queue" FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can insert own matchmaking_queue entry" ON public."matchmaking_queue" FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update own matchmaking_queue entry" ON public."matchmaking_queue" FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Admins can create notifications" ON public."notifications" FOR INSERT TO authenticated WITH CHECK ((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text));
CREATE POLICY "Enable read access for all users" ON public."notifications" FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can update own notifications" ON public."notifications" FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Participants can read own pvp_games" ON public."pvp_games" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users read own notifications" ON public."pvp_match_notifications" FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Authenticated users can read all pvp_ratings" ON public."pvp_ratings" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert own texts" ON public."texts" FOR INSERT TO authenticated WITH CHECK (((owner_id = ( SELECT auth.uid() AS uid)) OR ((owner_id IS NULL) AND (((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))));
CREATE POLICY "Allow read access to texts" ON public."texts" FOR SELECT TO public USING (((owner_id IS NULL) OR (owner_id = ( SELECT auth.uid() AS uid)) OR (((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)));
CREATE POLICY "Allow users to delete their own texts" ON public."texts" FOR DELETE TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Allow users to update their own texts" ON public."texts" FOR UPDATE TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can insert their own quiz results" ON public."user_activity" FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can read own quiz results" ON public."user_activity" FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Users can update own activity" ON public."user_activity" FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Public users are viewable by everyone." ON public."users" FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert their own profile." ON public."users" FOR INSERT TO public WITH CHECK ((( SELECT auth.uid() AS uid) = id));
CREATE POLICY "Users can update own profile." ON public."users" FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) = id));
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO anon,authenticated;
