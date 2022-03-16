'use strict'

var chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
var expect = chai.expect
var OpenRefine = require('../').OpenRefine
var fs = require('fs')
var csv = require('csv')

describe('OpenRefine', () => {
  var test_project_name = 'dont_use_this_name'
  //var test_project_name = 'abc'

  describe('server', () => {
    describe('get projects metadata', () => {
      var projects_data
      before(() =>
        OpenRefine()
          .projects()
          .then(data => projects_data = data)
      )

      it('should have correct format', () => {
        expect(projects_data.projects).to.be.defined
        Object.keys(projects_data).forEach(id => {
          expect(projects_data[id].name).to.be.defined
          expect(projects_data[id].created).to.be.defined
          expect(projects_data[id].modified).to.be.defined
        })
      })
    })

    describe('create projects', () => {
      it('should create projects by name', () => {
        var p = OpenRefine().create(test_project_name)
        expect(p.id()).to.be.undefined
      })

      it('should create projects without a name', () => {
        var p = OpenRefine().create()
        expect(p.name()).to.exist
      })
    })

    describe('load projects', () => {
      var id
      before(() => {
        var project = OpenRefine()
          .create(test_project_name)
        project
          .load('test/test.csv')
          .end()
          .then(() => id = project.id())
        return project
      })

      it('should open projects by id', () =>
        OpenRefine()
          .open(id)
      )
    })

    describe('delete projects', () => {
      var id
      before(() =>
        OpenRefine()
          .create(test_project_name)
          .load('test/test.csv')
      )
      after(() => OpenRefine().delete(id))

      it('should delete projects', () =>
        OpenRefine()
          .delete(id)
          .then(() => OpenRefine().projects())
          .then(data => {
            expect(data).to.not.have.property(id)
          })
      )
    })
  })

  describe('project', () => {
    after((done) =>
      OpenRefine()
        .projects()
        .then(projects =>
          Object.keys(projects)
            .filter(id => projects[id].name === test_project_name)
        )
        .then(ids => ids.forEach(OpenRefine().delete))
        .then(done, done)
    )

    describe('load data', () => {
      it('should load the data and output at end', async () => {
        var token = await OpenRefine().getCsrfToken();
        expect(
          OpenRefine()
            .create(test_project_name)
            .load('test/test.csv', token)
            .end()
          ).to.eventually.be.ok
        })
    })

    describe('data format', () => {

      describe('in objects', () => {
        it('should expose data in array of objects', async () => {
          var token = await OpenRefine().getCsrfToken();
          expect(
            OpenRefine()
              .create(test_project_name)
              .load('test/test.csv', token)
              .end(token)
            ).to.eventually.eql([
              {Date: '2018-11-13', Number: '123'},
              {Date: '2018-11-14', Number: '45671'},
              {Date: '2018-11-15', Number: '991'},
              {Date: '2018-11-16', Number: '3025'},
              {Date: '2018-11-17', Number: '104234'},
            ])
        })
      })

      describe('in CSV', () => {
        it('should expose data in CSV', async () => {
          var token = await OpenRefine().getCsrfToken();
          expect(
            OpenRefine()
              .create(test_project_name)
              .expose('csv')
              .load('test/test.csv', token)
              .end(data => data, token)
            ).to.eventually.match(/^Date,Number\n/)
        })
      })

      describe('in TSV', () => {
        it('should expose data in TSV', async () => {
          var token = await OpenRefine().getCsrfToken();
          expect(
            OpenRefine()
              .create(test_project_name)
              .expose('tsv')
              .load('test/test.csv', token)
              .end()
            ).to.eventually.match(/^Date\tNumber\n/)
        })
      })
    })

    describe('apply operations', () => {
      it('should apply operations to project', async () => {
        var token = await OpenRefine().getCsrfToken();
        expect(
          OpenRefine()
            .create(test_project_name)
            .use(JSON.parse(fs.readFileSync('test/op.json')))
            .load('test/test.csv', token)
            .end()
          ).to.eventually.eql([
              {'Date 1': '2018', 'Date 2': '11', 'Date 3': '13', Number: '123'},
              {'Date 1': '2018', 'Date 2': '11', 'Date 3': '14', Number: '45671'},
              {'Date 1': '2018', 'Date 2': '11', 'Date 3': '15', Number: '991'},
              {'Date 1': '2018', 'Date 2': '11', 'Date 3': '16', Number: '3025'},
              {'Date 1': '2018', 'Date 2': '11', 'Date 3': '17', Number: '104234'},
          ])
      })
    })

    describe('destroy project', async () => {
      var project
      var token = await OpenRefine().getCsrfToken();

      before(done => {
        project = OpenRefine()
          .create(test_project_name)
        project
          .load('test/test.csv', token)
          .end()
          .then(() => done())
      })
      before(done => {
        project.destroy(token)
          .then(() => done())
      })

      it('should delete the project', () => {
        return expect(OpenRefine()
          .projects()
          ).to.eventually.not.include.keys(project.id())
      })
    })

  })
})
