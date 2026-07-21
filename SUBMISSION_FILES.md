# Required Judged Files

The judge must receive the files below. A repository URL alone is not enough if
the submission system builds a separate or filtered "judged files" subset.

## Mandatory file set

- `README.md`
- `counter.compact`
- `tests/counter.test.ts`
- the complete `managed/counter/` directory, including:
  - `managed/counter/contract/index.js`
  - `managed/counter/contract/index.d.ts`
  - `managed/counter/compiler/contract-info.json`
  - `managed/counter/zkir/`
  - `managed/counter/keys/`

Before submitting, run:

```bash
npm run submission:verify
```

The command fails if a mandatory file is missing, untracked, or lacks the
Compact declarations needed by mandatory judging steps 1 and 2.

When the submission form has a file picker, explicitly select `counter.compact`,
`README.md`, `tests/counter.test.ts`, and every tracked file under
`managed/counter/`. Confirm they appear in the form's final judged-files preview.
