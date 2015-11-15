
var expect = require('chai').expect
var OpenRefine = require('../').OpenRefine

describe('OpenRefine API', () => {

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
            return done('Incorrect data in project ' + id)
          }
        })
        done()
      })
      .catch(done)
  })

})
