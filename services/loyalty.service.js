const Reward = require('../models/Reward');
const dbHandler = require('../data/dbHandler');

class LoyaltyService {
  async getPoints(isDbConnected, userId) {
    if (isDbConnected) {
      let reward = await Reward.findOne({ user: userId });
      if (!reward) {
        reward = await Reward.create({
          user: userId,
          points: 0,
          redeemedPoints: 0,
          availablePoints: 0
        });
      }
      return reward;
    } else {
      let reward = dbHandler.findOne('rewards', { user: userId });
      if (!reward) {
        reward = dbHandler.insert('rewards', {
          user: userId,
          points: 0,
          redeemedPoints: 0,
          availablePoints: 0
        });
      }
      return reward;
    }
  }

  async addPoints(isDbConnected, userId, pointsAmount = 100) {
    if (isDbConnected) {
      let reward = await Reward.findOne({ user: userId });
      if (!reward) {
        reward = new Reward({
          user: userId,
          points: pointsAmount,
          redeemedPoints: 0,
          availablePoints: pointsAmount
        });
        await reward.save();
      } else {
        reward.points += pointsAmount;
        reward.availablePoints += pointsAmount;
        await reward.save();
      }
      return reward;
    } else {
      let reward = dbHandler.findOne('rewards', { user: userId });
      if (!reward) {
        reward = dbHandler.insert('rewards', {
          user: userId,
          points: pointsAmount,
          redeemedPoints: 0,
          availablePoints: pointsAmount
        });
      } else {
        reward.points = (reward.points || 0) + pointsAmount;
        reward.availablePoints = (reward.availablePoints || 0) + pointsAmount;
        dbHandler.update('rewards', reward._id || reward.id, reward);
      }
      return reward;
    }
  }

  async redeemPoints(isDbConnected, userId, pointsAmount) {
    if (isDbConnected) {
      const reward = await Reward.findOne({ user: userId });
      if (!reward || reward.availablePoints < pointsAmount) {
        throw new Error('Insufficient points available');
      }
      reward.availablePoints -= pointsAmount;
      reward.redeemedPoints += pointsAmount;
      await reward.save();
      return reward;
    } else {
      const reward = dbHandler.findOne('rewards', { user: userId });
      if (!reward || reward.availablePoints < pointsAmount) {
        throw new Error('Insufficient points available');
      }
      reward.availablePoints -= pointsAmount;
      reward.redeemedPoints = (reward.redeemedPoints || 0) + pointsAmount;
      dbHandler.update('rewards', reward._id || reward.id, reward);
      return reward;
    }
  }

  // Deduct/refund points if a booking is cancelled
  async refundPoints(isDbConnected, userId, pointsRefunded, pointsRedeemedRefunded) {
    if (isDbConnected) {
      const reward = await Reward.findOne({ user: userId });
      if (reward) {
        reward.points -= pointsRefunded;
        reward.availablePoints -= pointsRefunded;
        
        // Add back redeemed points
        reward.availablePoints += pointsRedeemedRefunded;
        reward.redeemedPoints -= pointsRedeemedRefunded;
        await reward.save();
      }
    } else {
      const reward = dbHandler.findOne('rewards', { user: userId });
      if (reward) {
        reward.points = Math.max(0, (reward.points || 0) - pointsRefunded);
        reward.availablePoints = Math.max(0, (reward.availablePoints || 0) - pointsRefunded);
        
        reward.availablePoints += pointsRedeemedRefunded;
        reward.redeemedPoints = Math.max(0, (reward.redeemedPoints || 0) - pointsRedeemedRefunded);
        dbHandler.update('rewards', reward._id || reward.id, reward);
      }
    }
  }
}

module.exports = new LoyaltyService();
