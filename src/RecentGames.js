const Firestore = require('@google-cloud/firestore')
const { Timestamp } = Firestore

class RecentGames {
  constructor () {
    this.store = new Firestore({
      projectId: 'wikibattle-me'
    })

    this.collection = this.store.collection('recent-games')
  }

  async add (origin, goal) {
    const doc = {
      origin,
      goal,
      startedAt: Timestamp.now()
    }

    await this.collection.add(doc)
  }

  async get (limit = 20) {
    const query = await this.collection
      .orderBy('startedAt', 'desc')
      .limit(limit)
      .get()

    return query.docs.map((doc) => {
      const { origin, goal, startedAt } = doc.data()
      return {
        origin,
        goal,
        startedAt: startedAt instanceof Timestamp ? startedAt.toDate() : new Date(startedAt)
      }
    })
  }
}

module.exports = RecentGames
