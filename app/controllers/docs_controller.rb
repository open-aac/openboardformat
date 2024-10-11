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
  #   expect(args[:body]).to eq({
  #     content: {
  #       uid: ui.user_token(u),
  #       details: {
  #         primary_use: 'a',
  #         age: 'b',
  #         experience_level: 'c'
  #       }
  #     }.to_json,
  #     notification: 'anonymized_user_details',
  #     record: s.record_code,
  #     token: ui.settings['token']
  #   })
  # end.and_return(OpenStruct.new(code: 200, body: 'asdf'))

    if params['token'] == ENV['ANON_USER_TOKEN']
      if params['notification'] == 'anonymized_user_details'
        Stash.create({
          ref_id: (params['content'] || {})['uid'], 
          data: {
            record: params['record'],
            content: params['content']
          }
        })
      end
    end
    render json: {received: true, saved: saved}.to_json
  end
end
