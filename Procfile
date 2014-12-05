web: bundle exec rails server -p $PORT
resque: env QUEUE=* TERM_CHILD=1 bundle exec rake environment resque:work