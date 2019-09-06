import * as Yup from 'yup';
import { isBefore, parseISO, startOfHour } from 'date-fns';
import Meetup from '../models/Meetup';

class MeetupController {
  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.date().required(),
      banner_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    /**
     * Check for past dates
     */
    const { date } = req.body;

    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(401).json({ error: 'Past dates are not permitted' });
    }

    const meetup = await Meetup.create({ ...req.body, user_id: req.userId });

    return res.json(meetup);
  }

  async update(req, res) {
    const existsMeetup = await Meetup.findByPk(req.params.id);

    const { title, description, location, date, banner_id } = req.body;

    /**
     * Check if the meetup exists
     */
    if (!existsMeetup) {
      return res.status(400).json({ error: 'Meetup not found' });
    }

    /**
     * Check if is the same user that created a meetup
     */
    if (existsMeetup.user_id !== req.userId) {
      return res
        .status(401)
        .json({ error: 'You can only update your meetups' });
    }

    /**
     * Check for past dates
     */
    const hourStart = startOfHour(parseISO(existsMeetup.date));

    if (isBefore(hourStart, new Date())) {
      return res.status(401).json({ error: 'You can not update past meetups' });
    }

    const newHourStart = startOfHour(parseISO(date));

    if (isBefore(newHourStart, new Date())) {
      return res.status(401).json({ error: 'You can not set past dates' });
    }

    const meetup = await existsMeetup.update({
      title,
      description,
      location,
      date,
      banner_id,
    });

    return res.json(meetup);
  }
}

export default new MeetupController();
