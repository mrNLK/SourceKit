# 05 — Handle JD URL Parsing Failures Gracefully

In the job URL parsing flow (Path 3), when Exa content API fails to extract text from a JS-rendered page, the app should: (1) show a clear message like "Could not extract job description from this URL", (2) auto-switch the input to the JD text paste mode (Path 2), (3) pre-focus the text area so the user can paste immediately. Do not show a generic error. Do not leave the user on a loading screen. Test with a non-standard job board URL like careers.google.com to verify the fallback works.
