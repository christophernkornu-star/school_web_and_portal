-- ============================================================
-- STEP 1: CREATE exec_sql HELPER FUNCTION (run this first)
-- ============================================================
-- Paste this block into Supabase SQL Editor and RUN it.

CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Verify it was created:
SELECT 'exec_sql function created successfully' as status;

-- ============================================================
-- AFTER the above succeeds, run the blocks below in order.
-- ============================================================