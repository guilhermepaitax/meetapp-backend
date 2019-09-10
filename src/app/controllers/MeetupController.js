import * as Yup from 'yup';
import {
  isBefore,
  parseISO,
  startOfHour,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { Op } from 'sequelize';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';

class MeetupController {
  async index(req, res) {
    const page = req.query.page || 1;
    const searchDate = parseISO(req.query.date);

    const meetups = await Meetup.findAll({
      limit: 10,
      offset: (page - 1) * 10,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email'],
        },
        {
          model: File,
          as: 'banner',
          attributes: ['name', 'path', 'url'],
        },
      ],
      where: {
        date: {
          [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
        },
      },
    });

    return res.json(meetups);
  }

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
      return res.status(401).json({ error: 'Meetup date invalid' });
    }

    const meetup = await Meetup.create({ ...req.body, user_id: req.userId });

    return res.json(meetup);
  }

  async update(req, res) {
    const schema = Yup.object().schema({
      title: Yup.string(),
      description: Yup.string(),
      date: Yup.date(),
      location: Yup.string(),
      banner_id: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const existsMeetup = await Meetup.findByPk(req.params.id);

    const { title, description, location, date, banner_id } = req.body;

    /**
     * Check if the meetup exists
     */
    if (!existsMeetup) {
      return res.status(400).json({ error: 'Meetup not found.' });
    }

    /**
     * Check if is the same user that created a meetup
     */
    if (existsMeetup.user_id !== req.userId) {
      return res.status(401).json({ error: 'Can only update your meetups.' });
    }

    /**
     * Check for past dates
     */
    if (existsMeetup.past) {
      return res.status(401).json({ error: "Can't update past meetups." });
    }

    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(401).json({ error: 'Meetup date invalid' });
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

  async delete(req, res) {
    const meetup = await Meetup.findByPk(req.params.id);

    /**
     * Check if the meetup exists
     */
    if (!meetup) {
      return res.status(400).json({ error: 'Meetup not found.' });
    }

    /**
     * Check if is the same user that created a meetup
     */
    if (meetup.user_id !== req.userId) {
      return res.status(401).json({ error: 'Not authorized.' });
    }

    /**
     * Check for past dates
     */
    if (meetup.past) {
      return res.status(401).json({ error: "Can't delete past meetups." });
    }

    meetup.destroy();

    return res.json();
  }
}

export default new MeetupController();
