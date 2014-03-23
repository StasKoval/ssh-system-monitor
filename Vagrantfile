VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|

  config.vm.provider :virtualbox do |virtualbox|
    virtualbox.customize ["modifyvm", :id, "--memory", 2048]
    virtualbox.customize ["modifyvm", :id, "--cpuexecutioncap", "20"]
  end

  config.vm.define "precise64" do |precise64|
    precise64.vm.network "private_network", ip: "192.168.50.2"
    precise64.vm.box = "precise64"
  end

  config.vm.define "debian64" do |debian64|
    debian64.vm.network "private_network", ip: "192.168.50.3"
    debian64.vm.box = "chef/debian-7.4"
  end

end
