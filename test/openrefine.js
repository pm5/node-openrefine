'use strict'

var expect = require('chai').expect
var OpenRefine = require('../').OpenRefine
var fs = require('fs')
var csv = require('csv')

describe('OpenRefine', () => {
  var test_project_name = 'my_awesome_data_cleanup_project_dont_use_this_name_for_your_projects'

  describe('Server', () => {
    describe('get projects metadata', () => {
      var projects_data
      before(() =>
        OpenRefine()
          .projects_metadata()
          .then(data => projects_data = data)
      )

      it('should have correct format', () => {
        expect(projects_data.projects).to.be.defined
        Object.keys(projects_data.projects).forEach(id => {
          expect(projects_data.projects[id].name).to.be.defined
          expect(projects_data.projects[id].created).to.be.defined
          expect(projects_data.projects[id].modified).to.be.defined
        })
      })
    })

    describe('create projects', () => {
      it('should create projects by name', () => {
        var p = OpenRefine().create(test_project_name)
        return expect(p.id()).to.be.undefined
      })
    })

    describe('load projects', () => {
      var id
      before(() =>
        OpenRefine()
          .create(test_project_name)
          .upload('test/test.csv')
          .then(r => id = r.project_id)
      )

      it('should load projects by id', () =>
        OpenRefine()
          .load(id)
          .apply('test/op.json')
      )
    })

    describe('delete projects', () => {
      var id
      before(() =>
        OpenRefine()
          .create(test_project_name)
          .upload('test/test.csv')
          .then(r => id = r.project_id)
      )
      after(() => OpenRefine().delete(id))

      it('should delete projects', () =>
        OpenRefine()
          .delete(id)
          .then(() => OpenRefine().projects_metadata())
          .then(data => {
            expect(data).to.not.have.property(id)
          })
      )
    })
  })

  describe('Project', () => {
    after(() =>
      OpenRefine()
        .projects_metadata()
        .then(data =>
          Object.keys(data.projects)
            .filter(id => data.projects[id].name === test_project_name)
        )
        .then(ids => ids.forEach(OpenRefine().delete))
    )

    describe('upload data', () => {
      it('should create project by uploading data', () =>
        OpenRefine()
          .create(test_project_name)
          .upload('test/test.csv')
          .then(r => {
            expect(r.project_id).to.be.defined
            expect(r.project_id).to.be.a('number')
            expect(r.project_id).to.be.gte(0)
          })
      )
    })

    describe('apply operations', () => {
      it('should apply operations to project', () =>
        OpenRefine()
          .create(test_project_name)
          .upload('test/test.csv')
          .apply('test/op.json')
      )
    })

    describe('download data', () => {
      it('should download data from project', () =>
        OpenRefine()
          .create(test_project_name)
          .upload('test/test.csv')
          .download('csv', 'output.csv')
          .then(() => expect(fs.readFileSync('output.csv').toString('utf-8')).to.equal('日期,人數\n2018-11-13,123\n2018-11-14,45671\n2018-11-15,991\n2018-11-16,3025\n2018-11-17,104234\n'))
      )
    })

    describe('destroy project', () => {
      it('should destroy projects', () =>
        OpenRefine()
          .create(test_project_name)
          .upload('test/test.csv')
          .destroy()
      )
    })

    describe('export data', () => {
      it('should export data as text', () =>
        OpenRefine()
          .create(test_project_name)
          .upload('test/test.csv')
          .export()
          .then(text => expect(text).to.equal('日期,人數\n2018-11-13,123\n2018-11-14,45671\n2018-11-15,991\n2018-11-16,3025\n2018-11-17,104234\n')))
    })

    describe('pipe data in', () => {
      it('should pipe data into stream', () => {
        var sin = OpenRefine()
          .create(test_project_name)
        fs.createReadStream('test/test.csv')
          .pipe(sin)
          .export()
          .then(text => expect(text).to.equal('日期,人數\n2018-11-13,123\n2018-11-14,45671\n2018-11-15,991\n2018-11-16,3025\n2018-11-17,104234\n'))
      })
    })

    describe('pipe data out', () => {
      it('should pipe data out of stream', () => {
        var sout = OpenRefine()
          .create(test_project_name)
          .upload('test/test.csv')
          .pipe(csv.parse())
          .pipe(csv.transform(rec => {
            try {
              rec[0] = rec[0].replace(/-/g, '/')
            } catch (e) { /* ignore */ }
            return rec
          }))
          .pipe(csv.stringify())
        sout.setEncoding('utf-8')
        var output = ''
        sout.on('data', chunk => output += chunk)
        return new Promise(resolve => {
          sout.on('end', () => {
            expect(output).to.equal('日期,人數\n2018/11/13,123\n2018/11/14,45671\n2018/11/15,991\n2018/11/16,3025\n2018/11/17,104234\n')
            resolve()
          })
        })
      })
    })
  })
})
