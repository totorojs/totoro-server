# Socket And HTTP Proxy Performance

## Conditions

1. File size
    - small
    - large
    - large with gzip
2. Concurrency
    - low
    - high
3. Proxy type
    - http
    - socket.io
    - net

## Run

On the same computer:

```
$ node server.js
$ node client.js
```
On the different computer:

```
$ node server.js
$ node client.js {{serverip}}
```

