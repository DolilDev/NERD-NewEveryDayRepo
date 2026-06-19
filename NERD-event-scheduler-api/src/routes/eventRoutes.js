const express = require('express');
const controller = require('../controllers/eventController');

const router = express.Router();

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getOne);

module.exports = router;
