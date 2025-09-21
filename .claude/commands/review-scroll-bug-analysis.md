Perform a comprehensive code review focused on analyzing the scroll navigation bug in the LevelUp4 Next.js application.

Use the 'perform_code_review' tool (from the 'code-reviewer' MCP server) with the following parameters:
target: "branch_diff"
diffBase: "main"
llmProvider: "openai"
modelName: "gpt-5"
taskDescription: "CRITICAL PRODUCTION BLOCKER: Analyze Next.js 15.5.3 App Router scroll navigation bug where chapter-to-chapter navigation fails to scroll to top consistently. Client-side navigation (router.push, Link) starts at 98.4px then jumps to ~3000px after 500ms delay. Direct URL navigation works perfectly. Need root cause analysis of why parameter-based routing /learn/[id] preserves scroll position during client-side transitions but not server-side navigation."
reviewFocus: "Focus specifically on Next.js App Router scroll restoration behavior, parameter-based routing scroll memory, component lifecycle timing (useEffect/useLayoutEffect), client vs server navigation differences, focus management, and framework-level scroll position caching. Identify why 500ms delay occurs and what elements at 2800-3300px are being targeted. Analyze layout hierarchy and route transition behavior. Look for the root cause of why 21+ manual scroll override attempts have failed."
projectContext: "LevelUp4 is a training platform with chapter-based content navigation using Next.js 15.5.3 App Router. The /learn/[id] route displays individual chapters with Next/Previous navigation buttons at the bottom. The issue affects UX by causing jarring scroll jumps during chapter transitions. All attempts to override scroll behavior manually have failed, suggesting the issue is at a deeper framework level. The project uses force-dynamic configuration, middleware for auth, and has complex layout hierarchies. See CLAUDE.md for complete investigation history including 21+ failed solution attempts."
maxTokens: 500000