
$config = Get-Content next.config.js -Raw

# We want to remove the catchall block
$config = $config -replace "(?s)\{\s*urlPattern: /\.\*/i,[\s\S]*?networkTimeoutSeconds: 10,\s*\},\s*\},", "}"

# Add exclusions for HTML files so they aren`t precached
$config = $config -replace "exclude: \[", "exclude: [
      /\.html`$/,
      /_next\/static\/chunks\/pages\/.*\.js`$/,"

Set-Content next.config.js -Value $config

