const express = require('express');
const router = express.Router();
const pool = require('../config/db');


router.post('/reserve', async (req, res) => {
  const { event_id, user_id } = req.body;

  
  if (!event_id || !user_id) {
    return res.status(400).json({
      error: 'Поля event_id и user_id обязательны'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    
    const eventResult = await client.query(
      'SELECT id, name, total_seats FROM events WHERE id = $1',
      [event_id]
    );

    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Событие не найдено'
      });
    }

    const event = eventResult.rows[0];

    
    const existingBooking = await client.query(
      'SELECT id FROM bookings WHERE event_id = $1 AND user_id = $2',
      [event_id, user_id]
    );

    if (existingBooking.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Пользователь уже забронировал место на это событие'
      });
    }

    
    const bookingsCountResult = await client.query(
      'SELECT COUNT(*) as count FROM bookings WHERE event_id = $1',
      [event_id]
    );

    const bookedSeats = parseInt(bookingsCountResult.rows[0].count);
    if (bookedSeats >= event.total_seats) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Все места на это событие уже забронированы'
      });
    }

    
    const insertResult = await client.query(
      `INSERT INTO bookings (event_id, user_id, created_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       RETURNING id, event_id, user_id, created_at`,
      [event_id, user_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      booking: insertResult.rows[0],
      message: 'Место успешно забронировано'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    
    
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Пользователь уже забронировал место на это событие'
      });
    }

    console.error('Ошибка при бронировании:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  } finally {
    client.release();
  }
});

module.exports = router;

