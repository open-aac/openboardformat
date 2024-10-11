class DocsController < ApplicationController
  def index
    render :index
  end
  # home page, any additional documentation (prolly all in ember)
  # TODO: disqus or something on some of the pages??

  def word_list
    compset = AACMetrics::Loader.retrieve(params['list'])
    data = AACMetrics::Metrics.analyze(compset)
    if params['weights']
      render plain: data[:buttons].map{|b| [b[:label], b[:effort]].join(' ') }.compact.uniq.join("\n")
    else
      render plain: data[:buttons].map{|b| b[:label] }.compact.uniq.sort_by{|w| w.match(/^[a-zA-Z]/) ? w.downcase : ('zzz' + w.downcase)}.join("\n")
    end
  end

  def user_update
  # Typhoeus.post("https://www.openboardformat.org/user_update", body: {
  #   uid: '238oty4t8a3',
  #   details: {
  #     a: 1,
  #     b: 2,
  #     c: 'three'
  #   },
  #   record: 'whatever',
  #   notification: 'anonymized_user_details',
  #   token: ENV['ANON_USER_TOKEN']
  # }.to_json)

    valid = false
    saved = false
    if params['token'] == ENV['ANON_USER_TOKEN']
      if params['notification'] == 'anonymized_user_details'
        valid = true
        saved = !!Stash.create({
          ref_id: (params['content'] || {})['uid'], 
          data: {
            record: params['record'],
            content: params['content']
          }
        })
      end
    end
    render json: {received: true, valid: valid, saved: saved}.to_json
  end
end
