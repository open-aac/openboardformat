class DocsController < ApplicationController
  skip_before_action :verify_authenticity_token
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
  #   content: {
  #     uid: '238oty4t8a3',
  #     a: 1,
  #     b: 2,
  #     c: 'three'
  # }.to_json,
  #   record: 'whatever',
  #   notification: 'anonymized_user_details',
  #   token: ENV['ANON_USER_TOKEN']
  # }.to_json)

    valid = false
    saved = false
    read_body = request.body.read
    json = params
    if request.content_type == 'application/json'
      json = JSON.parse(read_body) rescue nil
    end

    if json && json['token'] == ENV['ANON_USER_TOKEN']
      valid = 'partial'
      if json['notification'] == 'anonymized_user_details'
        valid = true
        content = JSON.parse(json['content']) if json['content'].is_a?(String)
        content = json['content'] if json['content'].is_a?(Hash)
        content ||= {}
        content['source'] = "CoughDrop" if json['notification'] == 'anonymized_user_details'
        saved = !!Stash.create({
          ref_id: content['uid'], 
          data: {
            record: json['record'],
            content: content
          }
        })
      end
    else
      Stash.create(data: read_body)
    end
    render json: {received: true, valid: valid, saved: saved}.to_json
  end
end
