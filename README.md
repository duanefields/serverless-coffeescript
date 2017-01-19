# serverless-coffeescript

A quick and dirty plugin for serverless to compile coffee-script files into javascript at deploy time. Shameless cribbed from https://github.com/serverless/serverless-babel-plugin.

## Setup

You need to install the plugin:

```bash
npm install --save-dev serverless-coffeescript
```

Further you need to add the plugin to your `serverless.yml` and defined which preset you chose:

```yml
plugins:
  - serverless-coffeescript
```

# Usage

Simply run `serverless deploy` and it will compile every CoffeeScript file in your service
