module Converter
  S3_EXPIRATION_TIME=60*60
  CONTENT_LENGTH_RANGE=100.megabytes.to_i

  def self.upload_params(opts)
    # return stuff the client needs to upload directly to S3
  end
  
  def self.confirm_upload(remote_path)
    # HEAD request to confirm upload succeeded
    # return success/failure
  end
  
  def self.validate_file(url, type)
    if !url || !type
      raise "missing parameter"
    end
    # download the file
    fn = url.split(/\//)[-1].split(/\?/)[0]
    stash_path = OBF::Utils.temp_path(['', '.' + fn])
    f = File.open(stash_path, 'wb')
    f.binmode
    res = Typhoeus.get(url)
    f.write res.body
    f.close

    if type == 'obf'
      res = OBF::Validator.validate_file(stash_path)
      res[:filename] = fn
      res
    else
      raise "unknown validator: #{type}"
    end
  end

  def self.analyze_obfset(url, comp)
    obfset = AACMetrics::Loader.retrieve(url)
    compset = AACMetrics::Loader.retrieve(comp)
    AACMetrics::Metrics.analyze_and_compare(obfset, compset)
  end

  def self.generate_analysis(url, type)
    if !url || !type
      raise "missing parameter"
    end
    # convert to api URL if needed
    match = url.match(/^https?:\/\/.+coughdrop.com\/([^\/]+\/[^\/]+)$/)
    path = OBF::Utils.temp_path('result')
    hash = nil
    if type == 'url'
      if match
        url = "https://app.mycoughdrop.com/api/v1/boards/#{match[1]}/simple.obf"
      end
      hash = JSON.parse(AACMetrics::Loader.process(url).to_json)
    else
      # download the file
      fn = url.split(/\//)[-1].split(/\?/)[0]
      stash_path = OBF::Utils.temp_path(fn)
      f = File.open(stash_path, 'wb')
      f.binmode
      res = Typhoeus.get(url)
      f.write res.body
      f.close

      # run it through the converter
      hash = OBF::UnknownFile.to_external(stash_path)
    end
    obfset = AACMetrics::Loader.retrieve(hash)
    f = File.open(path, 'w')
    f.puts obfset.to_json
    f.close
    fn = File.basename(path)
    content_type = 'application/json'
    
    file = File.open(path, 'rb')
    # upload the converted file
    params = self.remote_upload_params(fn, content_type)
    post_params = params[:upload_params]
    post_params[:file] = file
    res = Typhoeus.post(params[:upload_url], body: post_params)
    file.close
    # return the final url on success
    if res.success?
      params[:full_url]
    else
      raise "analysis failed"
    end
  end
  
  def self.convert_file(url, type)
    if !url || !type
      raise "missing parameter"
    end
    # download the file
    fn = url.split(/\//)[-1].split(/\?/)[0]
    stash_path = OBF::Utils.temp_path(fn)
    f = File.open(stash_path, 'wb')
    f.binmode
    res = Typhoeus.get(url)
    f.write res.body
    f.close
#    `curl #{url} > #{stash_path}`
    
    # run it through the converter
    path = OBF::Utils.temp_path('result')
    content_type = 'application/pdf'
    if type == 'pdf'
      path = OBF::UnknownFile.to_pdf(stash_path, path + '.pdf')
    elsif type == 'obf'
      path = OBF::UnknownFile.to_obf_or_obz(stash_path, path)
      content_type = 'application/obf'
      if path && path.match(/\.obz$/)
        content_type = 'application/obz'
      end
    else
      raise "unknown conversion type: #{type}"
    end
    fn = File.basename(path)
    
    file = File.open(path, 'rb')
    # upload the converted file
    params = self.remote_upload_params(fn, content_type)
    post_params = params[:upload_params]
    post_params[:file] = file
    res = Typhoeus.post(params[:upload_url], body: post_params)
    
    # return the final url on success
    if res.success?
      params[:full_url]
    else
      raise "conversion failed"
    end
  end
  
  def self.remote_upload_params(filename, content_type)
    filename ||= "file"
    subfolder = "#{(Time.now.to_i % 3600).to_s}/#{rand(9999).to_s}"
    remote_path = "uploads/#{subfolder}/#{filename}"
    config = {
      :upload_url => "https://#{ENV['UPLOADS_S3_BUCKET']}.s3.amazonaws.com/",
      :access_key => ENV['AWS_KEY'],
      :secret => ENV['AWS_SECRET'],
      :bucket_name => ENV['UPLOADS_S3_BUCKET']
    }
    
    res = {
      :upload_url => config[:upload_url],
      :full_url => config[:upload_url] + remote_path,
      :upload_params => {
        'AWSAccessKeyId' => config[:access_key]
      }
    }
    
    policy = {
      'expiration' => (S3_EXPIRATION_TIME).seconds.from_now.utc.iso8601,
      'conditions' => [
        {'key' => remote_path},
        {'acl' => 'public-read'},
        ['content-length-range', 1, (CONTENT_LENGTH_RANGE)],
        {'bucket' => config[:bucket_name]},
        {'success_action_status' => '200'},
        {'content-type' => content_type}
      ]
    }
    # TODO: for pdfs, policy['conditions'] << {'content-disposition' => 'inline'}

    policy_encoded = Base64.encode64(policy.to_json).gsub(/\n/, '')
    signature = Base64.encode64(
      OpenSSL::HMAC.digest(
        OpenSSL::Digest.new('sha1'), config[:secret], policy_encoded
      )
    ).gsub(/\n/, '')

    res[:upload_params].merge!({
       'key' => remote_path,
       'acl' => 'public-read',
       'policy' => policy_encoded,
       'signature' => signature,
       'Content-Type' => content_type,
       'success_action_status' => '200'
    })
    res    
  end
end