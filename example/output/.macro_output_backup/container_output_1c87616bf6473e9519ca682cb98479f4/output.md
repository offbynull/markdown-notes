<div style="margin:2em; background-color: #e0e0e0;">

<strong>⚠️NOTE️️️⚠️</strong>

Be aware that the isolation regex (line 3) does not use a DOT_ALL flag. That is, the `.` meta-character doesn't match new lines. If you want to match new lines, use something like `[\s\S]` instance.
</div>

