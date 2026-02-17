# 13 Cutover and Rollback Plan

## Purpose
Define safe deployment progression and reversal strategy.

## Cutover Strategy
- Incremental by PR slices aligned to phase gates
- Validate each slice before next merge
- Avoid bundling incompatible concerns

## Rollback Triggers
- Gate validation failure after merge
- Regression in primary mode switching
- Popup workflow loss for required dense controls
- Accessibility blocking issue

## Rollback Procedure
1. Revert latest slice only.
2. Re-run baseline validation.
3. Confirm system stability.
4. Log root cause and corrective action before retry.

## Pre-Cutover Checklist
- Requirements updated
- Validation evidence attached
- Risk review signed
- Retirement impacts documented

## Post-Cutover Verification
- Embedded acceptance suite pass
- No missing workflow from retired modules
- No unexpected layout collisions

## Rollback Tiers
- Tier 1: Revert latest PR slice only
- Tier 2: Revert latest phase set
- Tier 3: Full rollback to last stable milestone tag

## Rollback Decision Inputs
- Severity and breadth of regression
- Availability of hotfix path
- User-impact window and operational urgency

## Communication Protocol
- Announce rollback start with reason and scope
- Publish expected recovery timeline
- Publish post-rollback validation summary
- Create follow-up corrective action item before reattempt
