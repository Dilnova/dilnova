import re
import sys

with open('drizzle/0013_enable_rls.sql', 'r') as f:
    content = f.read()

# Replace CREATE POLICY with idempotent DO blocks
def replacer(match):
    stmt = match.group(0)
    return f"""DO $$
BEGIN
    {stmt}
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;"""

new_content = re.sub(r'CREATE POLICY .*?;', replacer, content)

with open('drizzle/0013_enable_rls.sql', 'w') as f:
    f.write(new_content)
