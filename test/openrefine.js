
var expect = require('chai').expect
var OpenRefine = require('../').OpenRefine

describe('OpenRefine API', function () {
  it('can get projects metadata', done => {
    var server = OpenRefine()
    server.projects_metadata()
      .then(data => {
        if (!data.projects) {
          return done('Incorrect data')
        }
        Object.keys(data.projects).forEach(function (id) {
          if (!data.projects[id].name ||
              !data.projects[id].created ||
              !data.projects[id].modified) {
            return done('incorrect data in project ' + id + '.')
          }
        })
        done()
      })
      .catch(done)
  })

  it('can create project by uploading data', done => {
    var server = OpenRefine()
    server.project('my_awesome_data_cleanup_project')
      .upload('test/test.csv')
      .then(r => {
        if (!r.project_id) {
          return done('no project ID returned.')
        }
        if (typeof r.project_id !== 'number' || r.project_id <= 0) {
          return done('invalid project ID ' + r.project_id + '.')
        }
        done()
      })
      .catch(done)
  })

  it('can apply operations to project', done => {
    var server = OpenRefine()
    server.project('my_awesome_data_cleanup_project')
      .upload('test/test.csv')
      .apply('test/op.json')
      .then(() => done())
      .catch(done)
  })
})
