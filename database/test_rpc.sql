-- Simple test function to verify RPC connectivity
CREATE OR REPLACE FUNCTION test_rpc_connection()
RETURNS TEXT AS $$
BEGIN
  RETURN 'Connection Successful';
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION test_rpc_connection() TO authenticated;
GRANT EXECUTE ON FUNCTION test_rpc_connection() TO service_role;
