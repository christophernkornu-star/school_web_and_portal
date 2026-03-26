
$config = Get-Content next.config.js -Raw

# Replace Supabase entries from 200 to 15
$config = $config -replace "maxEntries: 200,(\s+)maxAgeSeconds: 60 \* 5", "maxEntries: 15,`$1maxAgeSeconds: 60 * 5"

# Replace JS static assets from 200 to 40
$config = $config -replace "maxEntries: 200,(\s+)maxAgeSeconds: 24 \* 60 \* 60", "maxEntries: 40,`$1maxAgeSeconds: 24 * 60 * 60"

Set-Content next.config.js -Value $config

