# Incident Report Template

**Incident ID**: INC-YYYY-MM-DD-NNN (e.g., INC-2025-10-19-001)
**Date**: YYYY-MM-DD
**Status**: Open / Investigating / Resolved / Closed
**Severity**: Critical / High / Medium / Low

## Incident Summary

**One-line summary**: [Brief description of the incident]

**Services Affected**:
- [ ] API Server
- [ ] Web UI
- [ ] Discovery Engine
- [ ] Neo4j
- [ ] PostgreSQL
- [ ] Redis
- [ ] Other: _______________

**Impact**:
- [ ] Complete service outage
- [ ] Partial service degradation
- [ ] Performance issues
- [ ] Data loss or corruption
- [ ] Security breach
- [ ] Other: _______________

## Timeline

| Time (UTC) | Event | Action Taken | Taken By |
|------------|-------|--------------|----------|
| HH:MM | Alert triggered: [alert name] | | Automated |
| HH:MM | Incident acknowledged | | [Name] |
| HH:MM | Investigation started | | [Name] |
| HH:MM | Root cause identified | | [Name] |
| HH:MM | Fix implemented | | [Name] |
| HH:MM | Service restored | | [Name] |
| HH:MM | Incident resolved | | [Name] |

## Detection

**How was the incident detected?**
- [ ] Automated alert (Prometheus/Grafana)
- [ ] User report
- [ ] Internal monitoring
- [ ] Manual discovery
- [ ] Third-party monitoring

**Alert Details** (if applicable):
- Alert Name:
- Alert Severity:
- Alert Time:
- Prometheus Query:

**First Reporter**:
- Name:
- Role:
- Contact:

## Impact Assessment

**User Impact**:
- Number of users affected:
- Duration of impact:
- User-facing symptoms:

**System Impact**:
- Services down:
- Data loss: Yes / No (If yes, describe)
- Performance degradation:
- Discovery jobs affected:

**Business Impact**:
- Revenue impact: $_______ (estimated)
- SLA violation: Yes / No
- Customer complaints:
- Compliance issues: Yes / No

## Root Cause Analysis

**What happened?**
[Detailed description of what went wrong]

**Why did it happen?**
[Root cause - technical reason for the failure]

**Contributing factors**:
1.
2.
3.

**5 Whys Analysis**:
1. Why did the incident occur?
2. Why [answer to #1]?
3. Why [answer to #2]?
4. Why [answer to #3]?
5. Why [answer to #4]?

**Root Cause**: [Final root cause from 5 Whys]

## Resolution

**Actions Taken**:
1. [Step 1 and outcome]
2. [Step 2 and outcome]
3. [Step 3 and outcome]

**Fix Applied**:
- Type: [ ] Restart [ ] Configuration change [ ] Code fix [ ] Rollback [ ] Other
- Description:
- Applied by:
- Applied at: YYYY-MM-DD HH:MM UTC

**Verification Steps**:
1. [Verification step 1 - result]
2. [Verification step 2 - result]
3. [Verification step 3 - result]

## Communication

**Internal Communication**:
- Slack channel: #incidents
- Email: incidents@example.com
- Incident commander: [Name]

**External Communication**:
- [ ] Status page updated
- [ ] Customer notification sent
- [ ] Support ticket created
- [ ] Social media update
- [ ] Not required

**Stakeholders Notified**:
| Stakeholder | Role | Notified At | Method |
|-------------|------|-------------|--------|
| | | | Slack/Email/Phone |
| | | | |

## Prevention

**Immediate Actions** (to prevent recurrence):
- [ ] [Action 1] - Owner: ______ Due: ______
- [ ] [Action 2] - Owner: ______ Due: ______
- [ ] [Action 3] - Owner: ______ Due: ______

**Long-term Improvements**:
- [ ] [Improvement 1] - Owner: ______ Due: ______
- [ ] [Improvement 2] - Owner: ______ Due: ______
- [ ] [Improvement 3] - Owner: ______ Due: ______

**Monitoring Enhancements**:
- [ ] Add new alert: ________________
- [ ] Improve existing alert: ________________
- [ ] Add dashboard: ________________

**Documentation Updates**:
- [ ] Update runbook: ________________
- [ ] Create new runbook: ________________
- [ ] Update architecture docs: ________________

## Lessons Learned

**What went well?**
1.
2.
3.

**What could be improved?**
1.
2.
3.

**Surprises / Unexpected findings**:
1.
2.

## Related Information

**Related Incidents**:
- INC-YYYY-MM-DD-NNN: [description]
- INC-YYYY-MM-DD-NNN: [description]

**Runbook Used**: [Link to runbook]

**Code Changes**:
- PR: [Link]
- Commits: [Links]

**Logs/Metrics**:
- Grafana Dashboard: [Link]
- Log Query: [Link]
- Error Tracking: [Link]

**External References**:
- Vendor support ticket: [Number]
- Community discussion: [Link]
- Stack Overflow: [Link]

## Sign-off

**Incident Commander**: __________________ Date: __________

**Technical Lead**: __________________ Date: __________

**Manager Approval**: __________________ Date: __________

---

## Post-Mortem Meeting

**Scheduled**: YYYY-MM-DD HH:MM
**Attendees**:
-
-
-

**Meeting Notes**: [Link to meeting notes doc]

**Action Items** (from post-mortem):
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| | | | |
| | | | |

---

## Appendix

### Metrics During Incident

- API Error Rate: ___%
- API Response Time (p95): ___ms
- Database Query Time (p95): ___ms
- CPU Usage: ___%
- Memory Usage: ___%
- Active Users: ___

### Commands Run

```bash
# Include key commands executed during incident response
```

### Log Excerpts

```
# Include relevant log entries
```

### Additional Notes

[Any other relevant information]
