
$content = Get-Content components\admin\AdminHeader.tsx -Raw
$oldBlock = @"
                        {termAlert.active && (
                          <>
                            <Link
                              href="/admin/settings/attendance"
                              onClick={() => setNotificationsOpen(false)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
"@

$newBlock = @"
                        {termAlert.active && !dismissedAtt && (
                            <Link
                              href="/admin/settings/attendance"
                              onClick={handleAttClick}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
"@
$content = $content.Replace($oldBlock, $newBlock)


$oldBlock2 = @"
                            </Link>

                            <Link
                              href="/admin/reports"
                              onClick={() => setNotificationsOpen(false)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
"@

$newBlock2 = @"
                            </Link>
                        )}
                        
                        {termAlert.active && !dismissedRem && (
                            <Link
                              href="/admin/reports"
                              onClick={handleRemClick}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
"@
$content = $content.Replace($oldBlock2, $newBlock2)

$oldBlock3 = @"
                            </Link>
                          </>
                        )}
"@
$newBlock3 = @"
                            </Link>
                        )}
"@
$content = $content.Replace($oldBlock3, $newBlock3)

Set-Content components\admin\AdminHeader.tsx -Value $content

