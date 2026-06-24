import re

# Read push-schema.ts
with open('db/push-schema.ts', 'r') as f:
    content = f.read()

# Extract all SQL within sql`...`
# But we also want the DROP statements
sqls = re.findall(r'await db\.execute\(sql`(.*?)`\);', content, re.DOTALL)

# Add them to a block
custom_sql = "\n\n-- Injected from db/push-schema.ts --\n"
for s in sqls:
    custom_sql += s.strip() + ";\n"
custom_sql += "-- End injected schema --\n\n"

# Read 0013_enable_rls.sql
with open('drizzle/0013_enable_rls.sql', 'r') as f:
    rls_content = f.read()

# The first DO block creates the service_role. We can put our schema right after it.
parts = rls_content.split('$$;', 1)
if len(parts) == 2:
    new_rls = parts[0] + '$$;' + custom_sql + parts[1]
else:
    new_rls = custom_sql + rls_content

with open('drizzle/0013_enable_rls.sql', 'w') as f:
    f.write(new_rls)

print("Injected push-schema.ts SQL into 0013_enable_rls.sql")
