# Buccaneer

Buccaneer is a torrenting client that uses the [BitTorrent specification](https://wiki.theory.org/BitTorrentSpecification) to download files.

This project was definitely on the harder side, and although Buccaneer does work it is not very efficient.

You shouldn't use this as a replacement to other Torrenting clients, it was meant to be a fun project for learning new things like:
- Buffers
- TCP Sockets
- Electron (notably how event listeners can be used in the global window API bridge)

Or going over existing things like:
- React
- Material UI
- Electron
- Typescript
- OOP

## Resources

- [Main tutorial](http://allenkim67.github.io/programming/2016/05/04/how-to-make-your-own-bittorrent-client.html) I followed (made by [Allen Kim](https://github.com/allenkim67)), very outdated and in plain JavaScript so not the easiest to digest.
- [Official BitTorrent protocol specification](https://www.bittorrent.org/beps/bep_0003.html), won't help you past getting initial peers but is very in-depth.
- [Another protocol specification](https://wiki.theory.org/BitTorrentSpecification), this one is a bit more modern and goes over everything

Inspired and found through the [create-your-own-x](https://github.com/danistefanovic/build-your-own-x) repository.

## Future Plans

If I can ever figure out whats causing the various TCP socket errors (mainly connection refused and timed-out) then I think Buccaneer would be actually feasible. But there's not a lot of help for this online sadly (and the error message is extremely unhelpful) so this project will likely just stay as-is.
