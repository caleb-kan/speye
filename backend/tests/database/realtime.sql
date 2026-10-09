BEGIN;

CREATE POLICY "PvP participants can receive broadcasts"
ON realtime.messages FOR SELECT TO authenticated
USING (
  extension = 'broadcast'
  AND EXISTS (
    SELECT 1 FROM public.pvp_games
    WHERE 'pvp-game:' || id::text = (SELECT realtime.topic())
      AND (SELECT auth.uid()) IN (player1_id, player2_id)
  )
);

CREATE POLICY "PvP participants can send broadcasts"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  extension = 'broadcast'
  AND EXISTS (
    SELECT 1 FROM public.pvp_games
    WHERE 'pvp-game:' || id::text = (SELECT realtime.topic())
      AND (SELECT auth.uid()) IN (player1_id, player2_id)
  )
);

COMMIT;
