# Contributing

To contribute, create an issue or comment on an existing issue that you would
like to work on. All code contributions require test coverage and must pass
formatting/lint checks before being approved and merged.

## Prerequisites

You must install deno to be able to run the application locally.

- https://deno.land

## Development

For development, the tests and example application can be run with deno.

To run the tests, use `deno task test` or `deno task test-watch`.

To update the snapshots used in tests, use `deno task test-update`.

To check formatting and run lint, use `deno task check`.

This repository uses squash merging. If your branch is merged into main, you can
get your branch back up to date with `deno task git-rebase`. Alternatively, you
can delete your branch and create a new one off of the main branch.
