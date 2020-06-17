/* eslint-disable new-cap */
/* eslint-disable unicorn/no-process-exit */
/* eslint-disable no-process-exit */
const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const put = require('../../put-api')
const requireAuth = require('../../require-auth')
const formatBytes = require('../../format-bytes')
const chalk = require('chalk')
const moment = require('moment')

class IndexCommand extends Command {
  async run() {
    const {flags} = this.parse(IndexCommand)
    const {argv} = this.parse(IndexCommand)
    let folderID = argv[0] || 0
    let limit = flags.limit || 1000
    let recursively = false

    // Process --limit -1
    if (limit === -1) {
      recursively = true
      limit = 1000
    }

    // Process --all flag
    if (flags.all) {
      folderID = -1
    }

    // Check for auth
    await requireAuth()

    // Query Put
    await put.Files.Query(folderID, {limit: limit})
    .then(async r => {
      // Setup data
      let data = r.data.files

      // Check for cursor if limit === -1
      if (recursively) {
        let cursor = r.data.cursor
        // Fetch all data
        while (cursor !== null) {
        // eslint-disable-next-line no-await-in-loop
          await put.Files.Continue(cursor)
          .then(r => {
            cursor = r.data.cursor
            data = data.concat(r.data.files)
          })
          .catch(error => {
            this.log(chalk.red('Error:', error.data.error_message))
            process.exit(1)
          })
        }
      }

      // Setup columns
      const columns = {
        id: {
          header: 'ID',
        },
        name: {},
        // eslint-disable-next-line camelcase
        file_type: {
          header: 'Type',
        },
        size: {
          header: 'Size',
          get: row => formatBytes(row.size),
        },
        // eslint-disable-next-line camelcase
        updated_at: {
          header: 'Date',
          get: row => moment.utc(row.updated_at).fromNow(),
        },

      }

      // Setup options
      const options = {
        sort: flags.sort,
        filter: flags.filter,
      }

      // Display table
      cli.table(data, columns, options)

      // Friendly display if there's nothing in the list
      if (data.length === 0) {
        this.log(chalk.yellow('No files! :)'))
      }
    })
    .catch(error => {
      this.log(chalk.red('Error:', error.data.error_message))
      process.exit(1)
    })
  }
}

IndexCommand.description = `Manage your Put.io files
...
This command lists all of the files in your root folder by default.
`

IndexCommand.flags = {
  sort: flags.string({description: '[property to sort by (prepend ' - ' for descending)]'}),
  filter: flags.string({description: '(filter property by partial string matching, ex: name=foo)'}),
  all: flags.boolean({description: '(all files of the user will be returned)'}),
  limit: flags.integer({description: '(number of items to return, if -1 is used, all files will be retreived recursively. Default is 1000.)'}),
}

IndexCommand.args = [
  {
    name: 'folderID',
    description: '(ID of folder to display files in.)',
  },
]

module.exports = IndexCommand
