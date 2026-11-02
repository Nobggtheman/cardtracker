CardTracker

Author: Gabriel Gomez Course: CMP 464/343 Product 1

1. About Me

One of my favorite hobbies is collecting trading cards, specifically sports cards. I am always buying and selling constantly on eBay. In fact, I am moving to Texas in February to open and run a local card shop. My collection has grown to the point where I can not tell you what is in my collection (at least 5000 cards) and with a market that rises and falls overnight the potential for missed sales arises. Here are some examples:

- Joshua Baez's 3 HR MLB debut – Baez was an overnight riser when he made his debut and had 3 homeruns. Baez is not a name that is considered top prospect and keep track of, since then his stock has fallen. I did not know I had a Baez prospect card until a month after his debut, missing the ideal time to sell.
- OG Anunoby Finals tip in – His tip in after the epic Finals comeback caused his stock to rise. I knew I had a true purple /75 because that is part of my personal collection, but I found a refractor numbered before the season started that I would have been willing to part with.
- Finding cards of "busts" such as Zaccharie Risacher which hurts because I should have sold a long long time ago And there is not much more I can do about that because no one would buy it.

2. Problem Statement

When a card rises I often ask myself, do I have a card of them that I could sell. Because I have so many cards it is impossible for me to know for sure without searching through boxes. This costs me in potential sales because I don't want to waste time searching. Right now I keep track of my collection from a google docs but it falls short because it is not that good for photos to see what the card looks like and I stopped updating it for this reason.

3. Existing Solutions

| Tool you've tried or found | What it does well?                                          | Where it falls short?                                                                 |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Ebay card scanner          | When accurate is good for determining what a card is worth. | Card photo scans can be inconsistent and wont save my card unless I list it for sale. |
| CollX app                  | Great at identifying and keeping track of inventory         | Forced to sell on the Collx app when I want to sell.                                  |

4. Features and Benefits and MVP

| Feature (what it does)                                                  | Benefit (what changes for me)                        | In MVP? |
| ----------------------------------------------------------------------- | ---------------------------------------------------- | ------- |
| Inventory tracker that just logs cards and I am able to search for them | I can find out if I have a card from a simple search | Yes     |
| Photo card identifyer where your card can be logged in from a photo.    | Would save time adding cards                         | No      |
| Price tracker notification where an alert gets sent when a card rises   | Can take advantage of a price jump.                  | Yes     |

For later:
- Tracking for cards beyond sports and into all TCG
- 

5. Tech Stack

| Layer             | Choice            | Why                            |
| ----------------- | ----------------- | ------------------------------ |
| Front end         | React web app     |                                |
| Back end          | Node.js + Express |                                |
| Database          | PostgreSQL        | For keeping track of inventory |
| Price data source | The Card API      | For tracking prices            |
| Hosting           | HTTPS             |                                |
| Notifications     | Browser push      |                                |
