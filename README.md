# ChatGPT for Slack

## Installation

```
pnpm i
```

## Usage

Please set the following environment variables:

`SLACK_SIGNING_SECRET` `SLACK_BOT_TOKEN` `SLACK_APP_TOKEN` `OPENAI_API_KEY`

Note:
1. Please issue a Socket Mode API key for the Slack bot. [ref](https://zenn.dev/dsl_gunma/articles/2ab0a125f416db)
2. `SLACK_BOT_TOKEN` starts with `xoxb-` and `SLACK_APP_TOKEN` starts with `xapp-` .

permissions required by a token:
- app_mentions:read
- channels:history
- channels:read
- chat:write

and

```
pnpm dev
```

