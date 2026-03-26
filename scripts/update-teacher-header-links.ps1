
$content = Get-Content components\teacher\TeacherHeader.tsx -Raw
$oldBlock = @"
                        {termAlert.active && (
                          <>
                            <Link
                              href="/teacher/attendance"
                              onClick={() => setNotificationsOpen(false)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
"@

$newBlock = @"
                        {termAlert.active && !dismissedAtt && (
                            <Link
                              href="/teacher/attendance"
                              onClick={handleAttClick}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
"@
$content = $content.Replace($oldBlock, $newBlock)


$oldBlock2 = @"
                            </Link>

                            <Link
                              href="/teacher/reports/bulk"
                              onClick={() => setNotificationsOpen(false)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
"@

$newBlock2 = @"
                            </Link>
                        )}
                        
                        {termAlert.active && !dismissedRem && (
                            <Link
                              href="/teacher/reports/bulk"
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

Set-Content components\teacher\TeacherHeader.tsx -Value $content

