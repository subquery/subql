---
name: Release checklist
about: checklist for all releases
title: Release checklist for [component]@[version]
labels: ''
assignees: jiqiang90

---

# Release Checklist

This is the release checklist for Subql Core including `@subql/node`, `@subql/cli` and `@subql/query` and the shared dependencies.
checks should be completed before publishing a new release.

## Preparation
[] ChangeLogs
[] Example and Docs

## Test
[] Use latest combination of subql-node and subql-query to run starter project from scratch in dev
[] Use latest combination of subql-node and subql-query to upgrade an existing project in dev

## Release
[] NPMjs.com publishing
[] dockerhub publishing
[] github release page
[] official announcement channels: discord, twitter, user tg channels

## Post Release
[] Upgrade our example projects to latest version
[] Query potential affected projects from our db and notify them via email or im.
