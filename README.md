[WikiBattle][]
--------------

[![Greenkeeper badge](https://badges.greenkeeper.io/goto-bus-stop/wikibattle.svg)](https://greenkeeper.io/)

1v1 races through Wikipedia article links.

[https://wikibattle.me][WikiBattle]

### Objective

You're thrown into a random article with a random opponent. The first to find
their way to the target article wins. Use only links in the articles, no back
button.

Articles are randomly selected from the top 5000 most popular articles of the
previous week, compiled by [Andrew G. West][Top 5000 pages].

After 40 seconds, you will get a hint, consisting of the first 200 characters of
the first paragraph of the target article. After 90 seconds, you will also get a
list of 25 article titles that link to the target article ("backlinks").

### Install

    git clone https://github.com/goto-bus-stop/WikiBattle
    cd WikiBattle
    npm install
    npm start

Then you'll be live at localhost:3000!

### License

[MIT]

[WikiBattle]: https://wikibattle.me
[Top 5000 pages]: https://en.wikipedia.org/wiki/Wikipedia:Top_5000_pages
[MIT]: ./LICENSE
