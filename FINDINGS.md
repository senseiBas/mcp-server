# Test Findings - Week 1

**Test periode:** 18 december 2025 - 25 december 2025  
**Status:** In testing 🧪

## Tools in Test
- ✅ `search_notes` - Search vault by query
- ✅ `get_note` - Read note with metadata
- ✅ `get_related_notes` - Get backlinks & outlinks
- ✅ `append_to_note` - Append content to note

---

## Findings

### High Priority 🔴
*Critical issues that break functionality*

- 

### Medium Priority 🟡
*Improvements needed for better UX*

- 

### Low Priority 🔵
*Nice to have, polish items*

- 

### Feature Requests 💡
*New ideas discovered during testing*

- **Bases Query Execution**: Explore headless Bases view approach for programmatic query execution. The Bases API provides `BasesQueryResult` with entries when you register a custom view. Could register a temporary "invisible" view to read query results and expose via MCP tool `query_base(base_file_path)`.
- **Plugin Integration**: Create tool(s) to leverage existing community plugins like Dataview, allowing Claude to query vault data through established plugin APIs rather than reimplementing logic.
- 

---

## Notes
*Additional context, observations, patterns*

- 

---

## Fix Session Planning
**Scheduled for:** ~25 december 2025  
**Focus:** Address High → Medium → Low → Features (if time)
