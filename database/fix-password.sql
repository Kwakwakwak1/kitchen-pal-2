-- Fix password script to ensure kitchen_pal_user has the correct password
-- This runs after the main init.sql to guarantee password is set

-- Set the password explicitly using environment variable if available
-- Note: This will use the POSTGRES_PASSWORD environment variable
DO $$
BEGIN
    -- Always set the password to ensure it's correct
    EXECUTE 'ALTER USER kitchen_pal_user PASSWORD ''' || coalesce(current_setting('app.postgres_password', true), 'kitchen_pal_password') || '''';
    RAISE NOTICE 'Password set for kitchen_pal_user';
EXCEPTION
    WHEN others THEN
        -- Fallback to hardcoded password if environment variable not available
        ALTER USER kitchen_pal_user PASSWORD 'kitchen_pal_password';
        RAISE NOTICE 'Fallback password set for kitchen_pal_user';
END $$; 