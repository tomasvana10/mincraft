# mincraft
Mineflayer CLI tool with support for macros and proxies

## Usage
```
mincraft [options] <host> <version>

Arguments:
  host                          Server hostname
  version                       Client version, e.g. 1.21.4

Options:
  -V, --version                 output the version number
  -p, --port <PORT>             Server port (default: 25565)
  --prox <HOST:PORT:USER:PASS>  Connect to the server with a proxy
  --prox-field-order <FORMAT>   The order of the proxy credential fields, e.g. "user,pass,host,port".
  --prox-field-sep <SEP>        The separator of the proxy credential fields
  --prox-type <4|5>             The SOCKS proxy type (default: 5)
  --ign <IN-GAME NAME>          Player username
  --uuid <UUID>                 Player UUID
  --email <EMAIL>               Account email
  --auth <AUTH>                 Account authentication method (default: "microsoft")
  --no-log-messages             Do not log messages your client receives
  --verbose                     Enable additional logging messages
  --exec <COMMANDS>             Execute REPL commands on startup with optional millisecond-based delays, e.g. "{{1000}}.li{{2000}}\nhello{{500}}\n.lo". (default: [])
  -h, --help                    display help for command

Examples:
$ mincraft mc.hypixel.net 1.21.4 --ign FuriousDestroyer --email you@example.com
$ mincraft mythic.gg 1.7.10 -p 58585 --ign MangoSyrup --email you@example.com --prox proxy.com:1234:mango:secret
$ mincraft mc.hypixel.net 1.21.4 --ign Player --email you@example.com --exec "{{1000}}.li{{2000}}\nhello{{500}}\n.lo --verbose"
```