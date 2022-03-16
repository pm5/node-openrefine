'use strict'

var sa = require('superagent')
var fs = require('fs')
var csv = require('csv')
var debug = require('debug')('openrefine')

// ES6 Promise plugin for superagent
function promise () {
  return function (req) {
    req.run = function () {
      return new Promise(function (resolve, reject) {
        Object.getPrototypeOf(req).end.call(req, function (err, res) {
          if (err) { return reject(err) }
          if (!res.ok) { return reject(res.error) }
          resolve(res)
        })
      })
    }
  }
}

// ignore HTTP 302 (promise-based) plugin for superagent
function ignore302 () {
  return req => {
    var prevRun = req.run
    req.run = () =>
      prevRun()
        .catch(err => {
          if (err.status === 302) {
            return err.response
          }
          return Promise.reject(err)
        })
  }
}

class Project {
  constructor (project_name, endpoint) {
    this._name = project_name || 'abc'
    this._endpoint = endpoint
    this._upload_queue = []
    this._input_format = 'csv'
    this._op = []
  }

  /**
   * Set or get project name.
   *
   * @param {String} name
   * @return {Project} for chaining
   * @api public
   */
  name () {
    if (arguments.length > 0) {
      this._name = arguments[0]
      return this
    }
    return this._name
  }

  /**
   * Get project ID.
   *
   * @return {String|undefined}
   * @api public
   */
  id () {
    return this._project_id ? String(this._project_id) : this._project_id
  }

  /**
   * Set or get input format.
   *
   * @param {String} format
   * @return {Project} for chaining
   * @api public
   */
  accept () {
    if (arguments.length > 0) {
      this._input_format = arguments[0]
      return this
    }
    return this._input_format
  }

  /**
   * Set or get output format.
   *
   * @param {String} format
   * @return {Project} for chaining
   * @api public
   */
  expose () {
    if (arguments.length > 0) {
      this._output_format = arguments[0]
      return this
    }
    return this._output_format
  }

  keep () {
    if (arguments.length > 0) {
      this._keep = arguments[0]
      return this
    }
    return this._keep
  }

  /**
   * Use operation in data pipeline.
   *
   * @param {object} op
   * @return {Project} for chaining
   * @api public
   */
  use (op, csrfToken) {
    this._op.push(this._apply_op(this._endpoint, op, csrfToken))
    return this
  }

  _upload_data (endpoint, project_name, file_name, csrfToken) {
    return sa.post(endpoint + '/command/core/create-project-from-upload?options={"encoding":"UTF-8","separator":",","ignoreLines":-1,"headerLines":1,"skipDataLines":0,"limit":-1,"storeBlankRows":true,"guessCellValueTypes":false,"processQuotes":true,"storeBlankCellsAsNulls":true,"includeFileSources":false}')
      .use(promise())
      .use(ignore302())
      .redirects(0)
      .field('project-name', project_name)
      .attach('project-file', fs.readFileSync(file_name), file_name)
      .query({ csrf_token: csrfToken })
  }

  _download_data (endpoint, project_id, format, csrfToken) {
    debug('download data in ' + project_id)
    return sa.post(endpoint + '/command/core/export-rows/' + project_id + '.' + format)
      .use(promise())
      .send('engine={"facets":[],"mode":"row-based"}')
      .send('project=' + project_id)
      .send('format=' + this._output_format)
      .query({ csrf_token: csrfToken })
      .run()
      .then(res => res.text)
  }

  _apply_op (endpoint, op, csrfToken) {
    debug('apply operations `%s`', JSON.stringify(op))
    return {
      run: () => {
        return sa.post(endpoint + '/command/core/apply-operations?project=' + this._project_id)
          .use(promise())
          .send('operations=' + JSON.stringify(op))
          .query({ csrf_token: csrfToken })
          .run()
      }
    }
  }

  _start_queue (queue) {
    if (this._current_job !== undefined) {
      return this._current_job
    }
    if (queue.length === 0) {
      return Promise.resolve()
    }
    this._current_job = queue.shift().run()
      .catch(err => debug(err.response))
      .then(res => {
        if (!this._project_id) {
          this._project_id = +res.headers.location.replace(this._endpoint + '/project?project=', '')
        }
        this._current_job = undefined
        return this._start_queue(queue)
      })
    return this._current_job
  }

  /**
   * Load data into pipeline.
   *
   * @param {String} file_name
   * @return {Project} for chaining
   * @api public
   */
  load (file_name, csrfToken) {
    debug('put ' + file_name + ' on queue')
    this._upload_queue.push(this._upload_data(this._endpoint, this._name, file_name, csrfToken))
    this._start_queue(this._upload_queue).catch(debug)
    return this
  }

  /**
   * Start data loading and operations.
   *
   * @param {Function} done
   * @return {Promise}
   * @api public
   */
  end (done, csrfToken) {
    var p = this._start_queue(this._upload_queue)
      .then(() => {
        return this._start_queue(this._op)
      })
      .then(() => {
        return this._download_data(this._endpoint, this._project_id, 'csv', csrfToken)
      })
    if (this.expose() === undefined) {
      p = p.then(text =>
        new Promise((resolve, reject) => csv.parse(text, { delimiter: '\t', columns: true }, (err, data) => {
          if (err) { return reject(err) }
          resolve(data)
        }))
      )
    }
    return p.then(done).catch(debug)
  }

  /**
   * Destroy project.
   *
   * @return {Promise}
   * @api public
   */
  destroy (csrfToken) {
    return this._start_queue(this._upload_queue)
      .then(() => this._start_queue(this._op))
      .then(() => {
        debug('delete project ' + this._project_id)
        return sa.post(this._endpoint + '/command/core/delete-project')
          .use(promise())
          .query({ csrf_token: csrfToken })
          .send('project=' + this._project_id)
          .run()
      })
  }
}

module.exports = function (endpoint) {
  var conf = {
    endpoint: endpoint || 'http://localhost:3333'
  }
  var server = {}

  /**
   * Create a new project.
   *
   * @param {String} project_name
   * @return {Project}
   * @api public
   */
  server.create = function (project_name) {
    debug('create project ' + project_name)
    var p = new Project(project_name, conf.endpoint)
    p._promise = Promise.resolve({ project_id: undefined })
    return p
  }

  /**
   * Open an existing project.
   *
   * @param {String} project_id
   * @return {Project}
   * @api public
   */
  server.open = function (project_id) {
    return new Project(undefined, conf.endpoint)
      .id(project_id)
  }

  /**
   * Get CSRF token.
   *
   * @return {Promise}
   * @api public
   */
  server.getCsrfToken = function () {
    debug('get csrf token')
    return sa.get(conf.endpoint + '/command/core/get-csrf-token')
      .use(promise())
      .run()
      .then(res => res.body.token)
  }

  /**
   * Get project metadata.
   *
   * @return {Promise}
   * @api public
   */
  server.projects = function () {
    debug('get projects metadata')
    return sa.get(conf.endpoint + '/command/core/get-all-project-metadata')
      .use(promise())
      .run()
      .then(res => res.body.projects)
  }

  server.delete = function (id) {
    debug('delete project ' + id)
    return sa.post(conf.endpoint + '/command/core/delete-project')
      .use(promise())
      .send('project=' + id)
      .run()
  }

  return server
}
