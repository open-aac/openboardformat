class CreateStashes < ActiveRecord::Migration[5.0]
  def change
    create_table :stashes do |t|
      t.text :data
      t.string :ref_id
      
      t.timestamps
    end
    add_index :stashes, [:ref_id]
  end
end
