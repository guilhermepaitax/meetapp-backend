import Meetup from '../models/Meetup';
import Subscription from '../models/Subscription';
import User from '../models/User';

import SubscriptionMail from '../jobs/SubscriptionMail';
import Queue from '../../lib/Queue';

class SubscriptionController {
  async store(req, res) {
    const meetup = await Meetup.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email'],
        },
      ],
    });

    /**
     * Check if the meetup exists
     */
    if (!meetup) {
      return res.status(400).json({ error: 'Meetup not found.' });
    }

    /**
     * Check if is the same user that created a meetup
     */
    if (meetup.user_id === req.userId) {
      return res
        .status(401)
        .json({ error: "Can't subscribe in your meetups." });
    }

    /**
     * Check for past dates
     */
    if (meetup.past) {
      return res
        .status(401)
        .json({ error: "Can't subscribe in past meetups." });
    }

    /**
     * Check if already subscribe
     */
    const isSubscribed = await Subscription.findOne({
      where: {
        user_id: req.userId,
        meetup_id: req.params.id,
      },
    });

    if (isSubscribed) {
      return res
        .status(401)
        .json({ error: 'You already subscribe in this meetup.' });
    }

    /**
     * Check for two meetups at the same time
     */
    const checkDate = await Subscription.findOne({
      where: {
        user_id: req.userId,
      },
      include: [
        {
          model: Meetup,
          required: true,
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (checkDate) {
      return res
        .status(400)
        .json({ error: "Can't subscribe to two meetups at the same time" });
    }

    /**
     * Sending email
     */
    const { name, email } = await User.findByPk(req.userId);

    const subscription = await Subscription.create({
      user_id: req.userId,
      meetup_id: req.params.id,
    });

    await Queue.add(SubscriptionMail.key, { meetup, name, email });

    return res.json(subscription);
  }
}

export default new SubscriptionController();
