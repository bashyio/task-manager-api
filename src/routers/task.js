const express = require('express')
const mongoose = require('mongoose')
const Task = require('../models/task')
const auth = require('../middleware/auth')

const router = new express.Router()

router.post('/tasks', auth, async (req, res) => {
  const task = new Task({
    ...req.body,
    owner: req.user.id
  })

  try {
    await task.save()
    res.status(201).send(task)
  } catch (e) {
    res.status(400).send(e)
  }
})

//GET /tasks?completed=true
//GET /tasks?limit=10&skip=10
//GET /tasks?sortBy=createdAt:desc
//GET /tasks?sortBy=completed:asc
router.get('/tasks', auth, async (req, res) => {
  const match = {}
  const sort = {}

  if (req.query.completed) {
    match.completed = req.query.completed === 'true'
  }

  if (req.query.sortBy) {
    const sortBy = req.query.sortBy.split(':')
    sort[sortBy[0]] = sortBy[1] === "desc" ? -1 : 1
  }

  try {
    await req.user.populate({
      path: 'tasks',
      match,
      options: {
        limit: parseInt(req.query.limit),
        skip: parseInt(req.query.skip),
        sort
      }
    }).execPopulate()
    res.status(200).send(req.user.tasks)
  } catch (e) {
    res.status(500).send()
  }
})

//Fetch tasks alternative using Mongoose aggregate to get the list and total in one query
router.get('/tasks-alt', auth, async (req, res) => {
  const match = {
    owner: req.user._id
  }
  const sort = {}

  if (req.query.completed) {
    match.completed = req.query.completed === 'true'
  }

  if (req.query.sortBy) {
    const sortBy = req.query.sortBy.split(':')
    sort[sortBy[0]] = sortBy[1] === "desc" ? -1 : 1
  }

  try {
    const [{
      result,
      totalCount: [{
        totalCount
      }]
    }] = await Task.aggregate([{
      $facet: {
        result: [{
            $match: match
          },
          {
            $skip: parseInt(req.query.skip)
          },
          {
            $limit: parseInt(req.query.limit)
          },
          {
            $sort: sort
          }
        ],
        totalCount: [{
          $match: match
        }, {
          $count: 'totalCount'
        }]
      }
    }])

    res.status(200).send({
      result,
      totalCount
    })
  } catch (e) {
    res.status(500).send()
  }

})

router.get('/tasks/:id', auth, async (req, res) => {
  const _id = req.params.id

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    res.status(404).send()
  }

  try {
    const task = await Task.findOne({
      _id,
      owner: req.user._id
    })

    if (!task) {
      res.status(404).send()
    }

    res.status(200).send(task)
  } catch (e) {
    res.status(500).send()
  }
})

router.patch('/tasks/:id', auth, async (req, res) => {
  const _id = req.params.id
  const allowedUpdates = ["title", "completed"]
  const updates = Object.keys(req.body)
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

  if (!mongoose.Types.ObjectId.isValid(_id) || !isValidOperation) {
    return res.status(400).send({
      error: 'Invalid update'
    })
  }

  try {
    const task = await Task.findOne({
      _id,
      owner: req.user._id
    })

    if (!task) {
      res.status(404).send()
    }

    updates.forEach((update) => {
      task[update] = req.body[update]
    })
    await task.save()

    res.status(200).send(task)
  } catch (e) {
    res.status(500).send()
  }
})

router.delete('/tasks/:id', auth, async (req, res) => {
  const _id = req.params.id

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).send()
  }

  try {
    const task = await Task.findOneAndDelete({
      _id,
      owner: req.user._id
    })

    if (!task) {
      return res.status(404).send()
    }

    res.status(200).send(task)
  } catch (e) {
    res.status(500).send()
  }
})

module.exports = router